import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import {
  ErrorCodes,
  type AuthMe,
  type AuthSession,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type RegisterResult,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { EmailService } from '../email/email.service';
import { publicTokens, TokensService } from './tokens.service';

export type AuthSessionIssue = { session: AuthSession; refreshToken: string };

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({ error: { code: ErrorCodes.Auth.EmailAlreadyUsed } });
    }
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        status: 'PENDING_VERIFICATION',
        roles: { create: { roleType: 'PLAYER' } },
      },
    });
    await this.issueVerification(user.id, user.email, user.displayName);
    return { status: 'pending_verification', email: user.email };
  }

  async login(input: LoginInput, meta: { userAgent?: string; ip?: string }): Promise<AuthSessionIssue> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    // Verify the password BEFORE revealing account state to avoid email enumeration.
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.EmailNotVerified } });
    }
    if (user.status === 'BLOCKED') {
      throw new ForbiddenException({ error: { code: ErrorCodes.Auth.AccountBlocked } });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.tokens.issuePair(user.id, meta);
    return { session: { user: this.toMe(user), tokens: publicTokens(tokens) }, refreshToken: tokens.refreshToken };
  }

  async verifyEmail(rawToken: string, meta: { userAgent?: string; ip?: string }): Promise<AuthSessionIssue> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.usedAt) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.VerificationTokenInvalid } });
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.VerificationTokenExpired } });
    }
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
      // Invalidate any other outstanding tokens for this user.
      await tx.emailVerificationToken.updateMany({
        where: { userId: stored.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { id: stored.userId },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
        include: { roles: true },
      });
    });
    const tokens = await this.tokens.issuePair(user.id, meta);
    return { session: { user: this.toMe(user), tokens: publicTokens(tokens) }, refreshToken: tokens.refreshToken };
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always resolve silently to avoid leaking which emails exist / their state.
    if (!user || user.status !== 'PENDING_VERIFICATION') {
      return;
    }
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.issueVerification(user.id, user.email, user.displayName);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.Unauthorized } });
    }
    const valid = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!valid) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async me(userId: string): Promise<AuthMe> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.Unauthorized } });
    }
    return this.toMe(user);
  }

  /** Creates a verification token and emails the confirmation link. */
  private async issueVerification(userId: string, email: string, displayName: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hash(rawToken);
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) },
    });
    await this.email.sendEmailVerification(email, displayName, this.verifyUrl(rawToken));
  }

  private verifyUrl(rawToken: string): string {
    const base = (this.config.get<string>('WEB_BASE_URL')?.trim() || 'http://localhost:3000').replace(/\/$/, '');
    const locale = this.config.get<string>('DEFAULT_LOCALE')?.trim() || 'ru';
    return `${base}/${locale}/verify-email?token=${rawToken}`;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toMe(user: {
    id: string;
    email: string;
    displayName: string;
    roles: { roleType: AuthMe['roles'][number] }[];
  }): AuthMe {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles.map((r) => r.roleType),
    };
  }
}
