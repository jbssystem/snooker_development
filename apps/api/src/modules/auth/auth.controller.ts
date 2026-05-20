import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  type AuthMe,
  type AuthSession,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type Tokens,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserId } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.register(body, requestMeta(req, ip));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.login(body, requestMeta(req, ip));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(
    @Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<Tokens> {
    return this.tokens.rotate(body.refreshToken, requestMeta(req, ip));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput): Promise<void> {
    await this.tokens.revoke(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string): Promise<AuthMe> {
    return this.auth.me(userId);
  }
}

function requestMeta(req: Request, ip: string): { userAgent?: string; ip?: string } {
  return {
    ...(req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {}),
    ...(ip ? { ip } : {}),
  };
}
