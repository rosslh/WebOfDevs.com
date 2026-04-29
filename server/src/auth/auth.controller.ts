import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('/login')
  async login(@Body() data: { token: string }) {
    return await this.authService.login(data.token);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('/refresh')
  async refresh(@Req() req: Request) {
    const refreshToken =
      req.cookies?.refresh_token ?? req.body?.refresh_token ?? '';
    return await this.authService.refresh(refreshToken);
  }

  @Post('/logout')
  async logout(@Req() req: Request) {
    const refreshToken =
      req.cookies?.refresh_token ?? req.body?.refresh_token ?? '';
    await this.authService.logout(refreshToken);
    return { success: true };
  }
}
