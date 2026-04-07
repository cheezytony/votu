import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const NOTIFICATIONS_QUEUE = 'notifications';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    await this.queue.add('send-verification-email', { to, code });
  }

  async sendVerificationSms(to: string, code: string): Promise<void> {
    await this.queue.add('send-verification-sms', { to, code });
  }
}
