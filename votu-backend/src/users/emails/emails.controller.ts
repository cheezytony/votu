import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserEmail } from '../entities/user-email.entity';
import { User } from '../entities/user.entity';
import { AddEmailDto } from './dto/add-email.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { EmailsService } from './emails.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me/emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  findAll(@Request() req: { user: User }): Promise<UserEmail[]> {
    return this.emailsService.findAll(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addEmail(
    @Request() req: { user: User },
    @Body() dto: AddEmailDto,
  ): Promise<UserEmail> {
    return this.emailsService.addEmail(req.user.id, dto.email);
  }

  @Post(':emailId/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Request() req: { user: User },
    @Param('emailId') emailId: string,
    @Body() dto: VerifyCodeDto,
  ): Promise<UserEmail> {
    return this.emailsService.verify(req.user.id, emailId, dto.code);
  }

  @Patch(':emailId/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Request() req: { user: User },
    @Param('emailId') emailId: string,
  ): Promise<UserEmail> {
    return this.emailsService.activate(req.user.id, emailId);
  }

  @Post(':emailId/resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(
    @Request() req: { user: User },
    @Param('emailId') emailId: string,
  ): Promise<void> {
    await this.emailsService.resendVerification(req.user.id, emailId);
  }
}
