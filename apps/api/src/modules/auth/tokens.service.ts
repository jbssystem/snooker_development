import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { ErrorCodes, type Tokens } from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

const ACCESS_TTL_SECONDS = 15 * 60; // 15 min
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type IssuedTokens = Tokens & { refreshToken: string };

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issuePair(userId: string, meta: { userAgent?: string; ip?: string }): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: ACCESS_TTL_SECONDS },
    );
    const refreshTokenRaw = randomBytes(48).toString('hex');
    const tokenHash = this.hash(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ip ?? null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      accessTokenExpiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async rotate(refreshToken: string, meta: { userAgent?: string; ip?: string }): Promise<IssuedTokens> {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.RefreshTokenInvalid } });
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.RefreshTokenExpired } });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.RefreshTokenInvalid } });
    }
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.RefreshTokenInvalid } });
    }
    return this.issuePair(stored.userId, meta);
  }

  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyAccess(token: string): Promise<{ sub: string }> {
    try {
      return await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.Unauthorized } });
    }
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

export function publicTokens(tokens: IssuedTokens): Tokens {
  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
  };
}
