import { createParamDecorator, ExecutionContext, NotFoundException } from '@nestjs/common';
import { ErrorCodes } from '@snooker/shared';
import type { ProfileAwareRequest, ProfileContext } from '../profile-context';

/** Full resolved access context for the active cabinet (null in bootstrap). */
export const ActiveProfile = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ProfileContext | null => {
    const req = ctx.switchToHttp().getRequest<ProfileAwareRequest>();
    return req.profile ?? null;
  },
);

/** The active cabinet's profile id; throws NoProfile when none is available. */
export const CurrentProfileId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<ProfileAwareRequest>();
    if (!req.profile) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.NoProfile } });
    }
    return req.profile.profileId;
  },
);
