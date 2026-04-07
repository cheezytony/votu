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
import { UserPhone } from '../entities/user-phone.entity';

const RESEND_RATE_MAX = 3;
const RESEND_RATE_TTL = 3600; // 1 hour in seconds
const VERIFY_MAX_ATTEMPTS = 5;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class PhonesService {
  constructor(
    @InjectRepository(UserPhone)
    private readonly phoneRepo: Repository<UserPhone>,
    private readonly notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: IORedis,
  ) {}

  async findAll(userId: string): Promise<UserPhone[]> {
    return this.phoneRepo.find({ where: { userId } });
  }

  async addPhone(userId: string, phone: string): Promise<UserPhone> {
    const existing = await this.phoneRepo.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('Phone number already in use');
    }

    const { code, hashedCode } = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + CODE_TTL_MS);

    const record = this.phoneRepo.create({
      userId,
      phone,
      isActivated: false,
      verifiedAt: null,
      verificationCode: hashedCode,
      codeExpiresAt,
      codeAttempts: 0,
    });
    await this.phoneRepo.save(record);

    await this.notificationsService.sendVerificationSms(phone, code);
    return record;
  }

  async verify(
    userId: string,
    phoneId: string,
    code: string,
  ): Promise<UserPhone> {
    const record = await this.findOwned(userId, phoneId);

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
      await this.phoneRepo.save(record);
      throw new UnprocessableEntityException('Invalid verification code');
    }

    record.verifiedAt = new Date();
    record.verificationCode = null;
    record.codeExpiresAt = null;
    record.codeAttempts = 0;
    await this.phoneRepo.save(record);
    return record;
  }

  async activate(userId: string, phoneId: string): Promise<UserPhone> {
    const record = await this.findOwned(userId, phoneId);

    if (!record.verifiedAt) {
      throw new UnprocessableEntityException(
        'Phone must be verified before activation',
      );
    }

    // Deactivate all other phones for this user
    await this.phoneRepo.update(
      { userId, isActivated: true },
      { isActivated: false },
    );

    record.isActivated = true;
    await this.phoneRepo.save(record);
    return record;
  }

  async resendVerification(userId: string, phoneId: string): Promise<void> {
    const record = await this.findOwned(userId, phoneId);

    if (record.verifiedAt) {
      throw new ConflictException('Phone number is already verified');
    }

    const rateKey = `rate:resend:phone:${record.phone}`;
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
    await this.phoneRepo.save(record);

    await this.notificationsService.sendVerificationSms(record.phone, code);
  }

  private async findOwned(userId: string, phoneId: string): Promise<UserPhone> {
    const record = await this.phoneRepo.findOne({ where: { id: phoneId } });
    if (!record || record.userId !== userId) {
      throw new NotFoundException('Phone not found');
    }
    return record;
  }
}
