import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleType } from '@prisma/client';
import { ErrorCodes } from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthedRequest } from './jwt-auth.guard';

/**
 * Enforces `@Roles(...)` metadata. Must run AFTER JwtAuthGuard so that
 * `req.userId` is populated. When no `@Roles` metadata is present the guard
 * is a no-op, so it is safe to stack globally on a controller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RoleType[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const roles = await this.prisma.role.findMany({
      where: { userId: req.userId },
      select: { roleType: true },
    });
    req.roles = roles.map((r) => r.roleType);
    if (!req.roles.some((role) => required.includes(role))) {
      throw new ForbiddenException({ error: { code: ErrorCodes.Auth.Forbidden } });
    }
    return true;
  }
}
