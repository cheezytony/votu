import {
    Body,
    Controller,
    Get,
    Patch,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@Request() req: { user: User }): User {
    return req.user;
  }

  @Patch()
  updateMe(
    @Request() req: { user: User },
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateMe(req.user.id, dto);
  }
}
