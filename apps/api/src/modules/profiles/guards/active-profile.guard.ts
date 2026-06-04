import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@snooker/shared';
import { ProfileAccessService } from '../profile-access.service';
import type { ProfileAwareRequest } from '../profile-context';
import { OWNER_ONLY_KEY, WRITE_ACCESS_KEY } from '../decorators/access.decorators';

/**
 * Resolves the active cabinet from the `X-Active-Profile` header (falling back
 * to the user's own profile) and attaches it to the request. Enforces
 * `@OwnerOnly()` and `@WriteAccess()` route metadata. Must run after
 * JwtAuthGuard (which sets req.userId).
 */
@Injectable()
export class ActiveProfileGuard implements CanActivate {
  constructor(
    private readonly access: ProfileAccessService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ProfileAwareRequest>();
    const header = req.headers['x-active-profile'];
    const activeProfileId = typeof header === 'string' && header.trim() ? header.trim() : undefined;

    const profile = await this.access.resolve(req.userId, activeProfileId);
    req.profile = profile;

    const targets = [context.getHandler(), context.getClass()];
    const requiresOwner = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY_KEY, targets);
    const requiresEdit = this.reflector.getAllAndOverride<boolean>(WRITE_ACCESS_KEY, targets);

    if (requiresOwner) {
      if (!profile || !profile.isOwner) {
        throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.OwnerOnly } });
      }
    } else if (requiresEdit) {
      if (!profile || profile.accessLevel !== 'EDIT') {
        throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.WriteAccessDenied } });
      }
    }
    return true;
  }
}
