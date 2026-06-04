import { z } from 'zod';
import { EmailSchema } from './auth';

export const MembershipRelationshipSchema = z.enum(['COACH', 'PARENT', 'GUEST']);
export type MembershipRelationship = z.infer<typeof MembershipRelationshipSchema>;

export const AccessLevelSchema = z.enum(['VIEW', 'EDIT']);
export type AccessLevel = z.infer<typeof AccessLevelSchema>;

export const InvitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'REVOKED',
  'EXPIRED',
]);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

/** A cabinet the current user can act in (own profile or a shared one). */
export const AccessibleProfileSchema = z.object({
  profileId: z.string().cuid(),
  displayName: z.string(),
  avatar: z.string().nullable(),
  isOwner: z.boolean(),
  // 'OWNER' is the synthetic relationship for the user's own cabinet.
  relationship: z.union([MembershipRelationshipSchema, z.literal('OWNER')]),
  accessLevel: AccessLevelSchema,
  canAccessWellness: z.boolean(),
});
export type AccessibleProfile = z.infer<typeof AccessibleProfileSchema>;

/** A member of the current owner's cabinet (for the access-management UI). */
export const ProfileMemberSchema = z.object({
  userId: z.string().cuid(),
  displayName: z.string(),
  email: z.string().email(),
  avatar: z.string().nullable(),
  relationship: MembershipRelationshipSchema,
  accessLevel: AccessLevelSchema,
  canAccessWellness: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ProfileMember = z.infer<typeof ProfileMemberSchema>;

/** A pending/resolved invitation issued by the cabinet owner. */
export const ProfileInvitationSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  relationship: MembershipRelationshipSchema,
  accessLevel: AccessLevelSchema,
  canAccessWellness: z.boolean(),
  status: InvitationStatusSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type ProfileInvitationSummary = z.infer<typeof ProfileInvitationSchema>;

/** Public preview of an invitation, shown on the accept page. */
export const InvitationPreviewSchema = z.object({
  cabinetName: z.string(),
  inviterName: z.string(),
  email: z.string().email(),
  relationship: MembershipRelationshipSchema,
  accessLevel: AccessLevelSchema,
  status: InvitationStatusSchema,
  // Whether a user account already exists for the invited email.
  requiresRegistration: z.boolean(),
});
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>;

/** An invitation addressed to the current user (pending, awaiting response). */
export const IncomingInvitationSchema = z.object({
  token: z.string(),
  cabinetName: z.string(),
  inviterName: z.string(),
  relationship: MembershipRelationshipSchema,
  accessLevel: AccessLevelSchema,
  createdAt: z.string().datetime(),
});
export type IncomingInvitation = z.infer<typeof IncomingInvitationSchema>;

export const CreateInvitationSchema = z.object({
  email: EmailSchema,
  relationship: MembershipRelationshipSchema,
  accessLevel: AccessLevelSchema.default('VIEW'),
  // Optional override; when omitted the server derives it from relationship.
  canAccessWellness: z.boolean().optional(),
});
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const UpdateMemberAccessSchema = z
  .object({
    accessLevel: AccessLevelSchema.optional(),
    canAccessWellness: z.boolean().optional(),
  })
  .refine((value) => value.accessLevel !== undefined || value.canAccessWellness !== undefined, {
    message: 'sharing.updateMember.empty',
  });
export type UpdateMemberAccessInput = z.infer<typeof UpdateMemberAccessSchema>;
