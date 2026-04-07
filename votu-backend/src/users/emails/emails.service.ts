import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import IORedis from 'ioredis';
import { Repository } from 'typeorm';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import {
    generateVerificationCode,
    sha256,
} from '../../common/utils/crypto.util';
import { NotificationsService } from '../../notifications/notifications.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { UserEmail } from '../entities/user-email.entity';

const RESEND_RATE_MAX = 3;
const RESEND_RATE_TTL = 3600; // 1 hour in seconds
const VERIFY_MAX_ATTEMPTS = 5;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class EmailsService {
  constructor(
    @InjectRepository(UserEmail)
    private readonly emailRepo: Repository<UserEmail>,
    private readonly notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: IORedis,
  ) {}

  async findAll(userId: string): Promise<UserEmail[]> {
    return this.emailRepo.find({ where: { userId } });
  }

  async addEmail(userId: string, email: string): Promise<UserEmail> {
    const emailLower = email.toLowerCase();
    const existing = await this.emailRepo.findOne({
      where: { email: emailLower },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const { code, hashedCode } = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS);

    const record = this.emailRepo.create({
      userId,
      email: emailLower,
      isActivated: false,
      verifiedAt: null,
      verificationCode: hashedCode,
      codeExpiresAt,
      codeAttempts: 0,
    });
    await this.emailRepo.save(record);

    await this.notificationsService.sendVerificationEmail(emailLower, code);
    return record;
  }

  async verify(
    userId: string,
    emailId: string,
    code: string,
  ): Promise<UserEmail> {
    const record = await this.findOwned(userId, emailId);

    if (record.codeAttempts >= VERIFY_MAX_ATTEMPTS) {
      throw new TooManyRequestsException(
        0,
        'Too many incorrect attempts. Request a new code.',
      );
    }

    if (
      !record.verificationCode ||
      !record.codeExpiresAt ||
      record.codeExpiresAt < new Date()
    ) {
      throw new UnprocessableEntityException('Verification code has expired');
    }

    const hashedInput = sha256(code);
    if (hashedInput !== record.verificationCode) {
      record.codeAttempts += 1;
      if (record.codeAttempts >= VERIFY_MAX_ATTEMPTS) {
        record.verificationCode = null;
        record.codeExpiresAt = null;
      }
      await this.emailRepo.save(record);
      throw new UnprocessableEntityException('Invalid verification code');
    }

    record.verifiedAt = new Date();
    record.verificationCode = null;
    record.codeExpiresAt = null;
    record.codeAttempts = 0;
    await this.emailRepo.save(record);
    return record;
  }

  async activate(userId: string, emailId: string): Promise<UserEmail> {
    const record = await this.findOwned(userId, emailId);

    if (!record.verifiedAt) {
      throw new UnprocessableEntityException(
        'Email must be verified before activation',
      );
    }

    // Deactivate all other emails for this user
    await this.emailRepo.update(
      { userId, isActivated: true },
      { isActivated: false },
    );

    record.isActivated = true;
    await this.emailRepo.save(record);
    return record;
  }

  async resendVerification(userId: string, emailId: string): Promise<void> {
    const record = await this.findOwned(userId, emailId);

    if (record.verifiedAt) {
      throw new ConflictException('Email is already verified');
    }

    const rateKey = `rate:resend:email:${record.email}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) {
      await this.redis.expire(rateKey, RESEND_RATE_TTL);
    }
    if (count > RESEND_RATE_MAX) {
      const ttl = await this.redis.ttl(rateKey);
      throw new TooManyRequestsException(Math.max(ttl, 1));
    }

    const { code, hashedCode } = generateVerificationCode();
    record.verificationCode = hashedCode;
    record.codeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
    record.codeAttempts = 0;
    await this.emailRepo.save(record);

    await this.notificationsService.sendVerificationEmail(record.email, code);
  }

  private async findOwned(userId: string, emailId: string): Promise<UserEmail> {
    const record = await this.emailRepo.findOne({ where: { id: emailId } });
    if (!record || record.userId !== userId) {
      throw new NotFoundException('Email not found');
    }
    return record;
  }
}
