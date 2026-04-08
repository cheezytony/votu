import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return new AuthResponse(user, accessToken);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const { user, accessToken, refreshToken } = await this.authService.login(
      dto.email,
      dto.password,
      clientIp,
    );
    this.setRefreshCookie(res, refreshToken);
    return new AuthResponse(user, accessToken);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = (req.cookies as Record<string, string>)[REFRESH_TOKEN_COOKIE];
    if (token) {
      await this.authService.logout(token);
    }
    this.clearRefreshCookie(res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token = (req.cookies as Record<string, string>)[REFRESH_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/auth/refresh',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.cookie(REFRESH_TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/auth/refresh',
      maxAge: 0,
    });
  }
}
