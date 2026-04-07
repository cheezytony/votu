import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Vote } from '../votes/entities/vote.entity';
import { PollOption } from './entities/poll-option.entity';
import { Poll } from './entities/poll.entity';
import { PollAutoCloseService } from './poll-auto-close.service';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';

@Module({
  imports: [TypeOrmModule.forFeature([Poll, PollOption, Vote]), AuthModule],
  controllers: [PollsController],
  providers: [PollsService, PollAutoCloseService],
  exports: [PollsService],
})
export class PollsModule {}
