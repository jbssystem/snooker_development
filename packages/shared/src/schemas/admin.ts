import { z } from 'zod';

export const UserStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'INVITED',
  'PENDING_VERIFICATION',
  'BLOCKED',
]);
export type UserStatusValue = z.infer<typeof UserStatusSchema>;

export const RoleTypeSchema = z.enum([
  'PLAYER',
  'COACH',
  'PARENT',
  'ACADEMY_ADMIN',
  'SYSTEM_ADMIN',
]);
export type RoleTypeValue = z.infer<typeof RoleTypeSchema>;

export const UserTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  reportCount: z.number(),
});
export type UserTokenUsage = z.infer<typeof UserTokenUsageSchema>;

export const AdminUserListItemSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  displayName: z.string(),
  status: UserStatusSchema,
  roles: z.array(RoleTypeSchema),
  emailVerifiedAt: z.string().datetime().nullable(),
  blockedReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
  tokenUsage: UserTokenUsageSchema,
});
export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>;

export const AdminUserListSchema = z.object({
  items: z.array(AdminUserListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type AdminUserList = z.infer<typeof AdminUserListSchema>;

export const AdminUserDetailSchema = AdminUserListItemSchema.extend({
  updatedAt: z.string().datetime(),
  blockedAt: z.string().datetime().nullable(),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export const AdminUsersQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: UserStatusSchema.optional(),
  role: RoleTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

export const BlockUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type BlockUserInput = z.infer<typeof BlockUserSchema>;

export const UpdateDrillVisibilitySchema = z.object({
  visibility: z.enum(['private', 'shared', 'system']),
});
export type UpdateDrillVisibilityInput = z.infer<typeof UpdateDrillVisibilitySchema>;

export const SetDrillHiddenSchema = z.object({
  hidden: z.boolean(),
});
export type SetDrillHiddenInput = z.infer<typeof SetDrillHiddenSchema>;

export const AdminStatsSchema = z.object({
  totalUsers: z.number(),
  usersByStatus: z.record(z.string(), z.number()),
  totalAdmins: z.number(),
  totalReports: z.number(),
  tokensThisMonth: z.number(),
  recentSignups: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      displayName: z.string(),
      createdAt: z.string().datetime(),
      status: UserStatusSchema,
    }),
  ),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;
