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
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  register(
    @Body() body: RegisterInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.register(body, { userAgent: req.headers['user-agent'], ip });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  login(
    @Body() body: LoginInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<AuthSession> {
    return this.auth.login(body, { userAgent: req.headers['user-agent'], ip });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  refresh(
    @Body() body: RefreshInput,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<Tokens> {
    return this.tokens.rotate(body.refreshToken, {
      userAgent: req.headers['user-agent'],
      ip,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  async logout(@Body() body: RefreshInput): Promise<void> {
    await this.tokens.revoke(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string): Promise<AuthMe> {
    return this.auth.me(userId);
  }
}
