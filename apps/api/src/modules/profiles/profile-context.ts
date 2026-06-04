import type { AccessLevel, MembershipRelationship } from '@snooker/shared';
import type { AuthedRequest } from '../auth/guards/jwt-auth.guard';

/**
 * Resolved access of the acting user to the "active cabinet" of a request.
 * `userId` is who is acting (stored as createdByUserId on writes); `profileId`
 * is whose cabinet (PlayerProfile) the data belongs to.
 */
export interface ProfileContext {
  userId: string;
  profileId: string;
  isOwner: boolean;
  accessLevel: AccessLevel;
  canAccessWellness: boolean;
  relationship: MembershipRelationship | 'OWNER';
}

/** Express request augmented by ActiveProfileGuard with the resolved context. */
export interface ProfileAwareRequest extends AuthedRequest {
  profile?: ProfileContext | null;
}
