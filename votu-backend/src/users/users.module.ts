import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailsController } from './emails/emails.controller';
import { EmailsService } from './emails/emails.service';
import { PhonesController } from './phones/phones.controller';
import { PhonesService } from './phones/phones.service';
import { User } from './entities/user.entity';
import { UserEmail } from './entities/user-email.entity';
import { UserPhone } from './entities/user-phone.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserEmail, UserPhone]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [UsersController, EmailsController, PhonesController],
  providers: [UsersService, EmailsService, PhonesService],
  exports: [UsersService],
})
export class UsersModule {}
