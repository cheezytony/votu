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
import { UserPhone } from '../entities/user-phone.entity';
import { User } from '../entities/user.entity';
import { AddPhoneDto } from './dto/add-phone.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { PhonesService } from './phones.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me/phones')
export class PhonesController {
  constructor(private readonly phonesService: PhonesService) {}

  @Get()
  findAll(@Request() req: { user: User }): Promise<UserPhone[]> {
    return this.phonesService.findAll(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addPhone(
    @Request() req: { user: User },
    @Body() dto: AddPhoneDto,
  ): Promise<UserPhone> {
    return this.phonesService.addPhone(req.user.id, dto.phone);
  }

  @Post(':phoneId/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Request() req: { user: User },
    @Param('phoneId') phoneId: string,
    @Body() dto: VerifyCodeDto,
  ): Promise<UserPhone> {
    return this.phonesService.verify(req.user.id, phoneId, dto.code);
  }

  @Patch(':phoneId/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Request() req: { user: User },
    @Param('phoneId') phoneId: string,
  ): Promise<UserPhone> {
    return this.phonesService.activate(req.user.id, phoneId);
  }

  @Post(':phoneId/resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(
    @Request() req: { user: User },
    @Param('phoneId') phoneId: string,
  ): Promise<void> {
    await this.phonesService.resendVerification(req.user.id, phoneId);
  }
}
