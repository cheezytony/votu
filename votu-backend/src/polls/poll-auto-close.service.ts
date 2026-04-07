import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poll, PollStatus } from './entities/poll.entity';

@Injectable()
export class PollAutoCloseService {
  private readonly logger = new Logger(PollAutoCloseService.name);

  constructor(
    @InjectRepository(Poll)
    private readonly pollRepo: Repository<Poll>,
  ) {}

  @Cron('* * * * *') // every minute
  async closeExpiredPolls(): Promise<void> {
    const result = await this.pollRepo
      .createQueryBuilder()
      .update(Poll)
      .set({ status: PollStatus.CLOSED })
      .where('status = :status AND "expiresAt" <= NOW()', {
        status: PollStatus.ACTIVE,
      })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-closed ${result.affected} expired poll(s)`);
    }
  }
}
