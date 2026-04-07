import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenPurgeService {
  private readonly logger = new Logger(RefreshTokenPurgeService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<void> {
    const result = await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('"expiresAt" < NOW()')
      .execute();
    this.logger.log(`Purged ${result.affected ?? 0} expired refresh token(s)`);
  }
}
