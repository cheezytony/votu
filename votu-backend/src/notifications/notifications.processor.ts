import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-verification-email':
        // TODO (B3.2): integrate real email provider
        console.log(
          `[Email] To: ${job.data.to as string} | Code: ${job.data.code as string}`,
        );
        break;
      case 'send-verification-sms':
        // TODO (B3.2): integrate real SMS provider
        console.log(
          `[SMS] To: ${job.data.to as string} | Code: ${job.data.code as string}`,
        );
        break;
      default:
        console.warn(`Unknown notification job: ${job.name}`);
    }
  }
}
