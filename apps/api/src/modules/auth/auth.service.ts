import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ErrorCodes, type AuthMe, type AuthSession, type LoginInput, type RegisterInput } from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { publicTokens, TokensService } from './tokens.service';

export type AuthSessionIssue = { session: AuthSession; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async register(input: RegisterInput, meta: { userAgent?: string; ip?: string }): Promise<AuthSessionIssue> {
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
        roles: { create: { roleType: 'PLAYER' } },
      },
      include: { roles: true },
    });
    const tokens = await this.tokens.issuePair(user.id, meta);
    return { session: { user: this.toMe(user), tokens: publicTokens(tokens) }, refreshToken: tokens.refreshToken };
  }

  async login(input: LoginInput, meta: { userAgent?: string; ip?: string }): Promise<AuthSessionIssue> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.InvalidCredentials } });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.tokens.issuePair(user.id, meta);
    return { session: { user: this.toMe(user), tokens: publicTokens(tokens) }, refreshToken: tokens.refreshToken };
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
