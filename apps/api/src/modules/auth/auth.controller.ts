import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ErrorCodes,
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  ResendVerificationSchema,
  VerifyEmailSchema,
  type AuthMe,
  type AuthSession,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type RegisterResult,
  type ResendVerificationInput,
  type Tokens,
  type VerifyEmailInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { publicTokens, TokensService } from './tokens.service';
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
  ): Promise<RegisterResult> {
    return this.auth.register(body);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) body: VerifyEmailInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.verifyEmail(body.token, requestMeta(req, ip)).then((issue) => {
      setRefreshCookie(res, issue.refreshToken);
      return issue.session;
    });
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendVerification(
    @Body(new ZodValidationPipe(ResendVerificationSchema)) body: ResendVerificationInput,
  ): Promise<void> {
    await this.auth.resendVerification(body.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.login(body, requestMeta(req, ip)).then((issue) => {
      setRefreshCookie(res, issue.refreshToken);
      return issue.session;
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(
    @Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<Tokens> {
    const refreshToken = body.refreshToken ?? readRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.RefreshTokenInvalid } });
    }
    return this.tokens.rotate(refreshToken, requestMeta(req, ip)).then((tokens) => {
      setRefreshCookie(res, tokens.refreshToken);
      return publicTokens(tokens);
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(RefreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = body.refreshToken ?? readRefreshCookie(req);
    if (refreshToken) {
      await this.tokens.revoke(refreshToken);
    }
    clearRefreshCookie(res);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string): Promise<AuthMe> {
    return this.auth.me(userId);
  }
}

const REFRESH_COOKIE = 'snooker_refresh';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: refreshCookieSecure(),
    sameSite: 'strict',
    path: refreshCookiePath(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: refreshCookieSecure(),
    sameSite: 'strict',
    path: refreshCookiePath(),
  });
}

function refreshCookiePath(): string {
  const configured = process.env.AUTH_REFRESH_COOKIE_PATH?.trim();
  return configured?.startsWith('/') ? configured : '/auth';
}

function refreshCookieSecure(): boolean {
  const configured = process.env.AUTH_REFRESH_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function readRefreshCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === REFRESH_COOKIE) {
      const value = valueParts.join('=');
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}

function requestMeta(req: Request, ip: string): { userAgent?: string; ip?: string } {
  return {
    ...(req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {}),
    ...(ip ? { ip } : {}),
  };
}
