import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import IORedis from 'ioredis';
import { Repository } from 'typeorm';
import { TooManyRequestsException } from '../common/exceptions/too-many-requests.exception';
import { generateVerificationCode, sha256 } from '../common/utils/crypto.util';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UserEmail } from '../users/entities/user-email.entity';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 30;
const LOGIN_RATE_MAX = 5;
const LOGIN_RATE_TTL = 900; // 15 min in seconds
// Precomputed bcrypt hash (cost 12) used for constant-time response when a login
// email is not found — prevents a timing oracle distinguishing valid vs unknown emails.
const DUMMY_HASH =
  '$2b$12$tYozBLT6kQ/zaJoAgHR20uZyMgIeTtVfe0kptCEgBoM4ZLBYgZJGu';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserEmail)
    private readonly userEmailRepo: Repository<UserEmail>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: IORedis,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const emailLower = dto.email.toLowerCase();

    const existing = await this.userEmailRepo.findOne({
      where: { email: emailLower },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      reference: randomBytes(16).toString('base64url').slice(0, 21),
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      lastName: dto.lastName,
      avatarUrl: null,
      passwordHash,
    });
    await this.userRepo.save(user);

    const { code, hashedCode } = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const userEmail = this.userEmailRepo.create({
      userId: user.id,
      email: emailLower,
      isActivated: true,
      verifiedAt: null,
      verificationCode: hashedCode,
      codeExpiresAt,
      codeAttempts: 0,
    });
    await this.userEmailRepo.save(userEmail);

    user.emails = [userEmail];
    user.phones = [];

    await this.notificationsService.sendVerificationEmail(emailLower, code);

    const { accessToken, refreshToken } = await this.generateTokenPair(user);
    return { user, accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
    clientIp: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    await this.checkLoginRateLimit(clientIp);

    const emailLower = email.toLowerCase();
    const userEmail = await this.userEmailRepo.findOne({
      where: { email: emailLower },
      relations: { user: true },
    });

    if (!userEmail) {
      await bcrypt.compare(password, DUMMY_HASH); // timing normalization
      await this.recordFailedLogin(clientIp);
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = userEmail.user;
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await this.recordFailedLogin(clientIp);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login counter on success
    await this.redis.del(`failed_login:${clientIp}`);

    const fullUser = await this.userRepo.findOne({
      where: { id: user.id },
      relations: { emails: true, phones: true },
    });

    const { accessToken, refreshToken } = await this.generateTokenPair(
      fullUser!,
    );
    return { user: fullUser!, accessToken, refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = sha256(refreshToken);
    await this.refreshTokenRepo.delete({ tokenHash: hash });
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const hash = sha256(refreshToken);
    // Atomic DELETE — prevents a race where two concurrent requests
    // both pass a findOne validity check and both succeed.
    // Note: TypeORM's PostgresQueryRunner returns [rows, rowCount] for DELETE
    // statements, so we destructure accordingly.
    const [deletedRows]: [Array<{ userId: string }>, number] =
      await this.refreshTokenRepo.query(
        `DELETE FROM refresh_tokens WHERE "tokenHash" = $1 AND "expiresAt" > NOW() RETURNING "userId"`,
        [hash],
      );

    if (!deletedRows.length) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const { userId } = deletedRows[0];
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { emails: true, phones: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokenPair(user);
    return { user, accessToken, refreshToken: newRefreshToken };
  }

  private async generateTokenPair(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({ sub: user.id });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);

    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    const tokenRecord = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.refreshTokenRepo.save(tokenRecord);

    return { accessToken, refreshToken: rawToken };
  }

  private async checkLoginRateLimit(ip: string): Promise<void> {
    const key = `failed_login:${ip}`;
    const count = await this.redis.get(key);
    if (count && parseInt(count) >= LOGIN_RATE_MAX) {
      const ttl = await this.redis.ttl(key);
      throw new TooManyRequestsException(
        Math.max(ttl, 1),
        'Too many failed login attempts',
      );
    }
  }

  private async recordFailedLogin(ip: string): Promise<void> {
    const key = `failed_login:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, LOGIN_RATE_TTL);
    }
  }
}
