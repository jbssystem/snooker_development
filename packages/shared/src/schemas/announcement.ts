import { z } from 'zod';

export const AnnouncementTypeSchema = z.enum(['release_note', 'announcement', 'maintenance']);
export type AnnouncementType = z.infer<typeof AnnouncementTypeSchema>;

export const AnnouncementSeveritySchema = z.enum(['info', 'warning', 'critical']);
export type AnnouncementSeverity = z.infer<typeof AnnouncementSeveritySchema>;

/** Lightweight DTO returned to authenticated users for the header banner. */
export const ActiveAnnouncementSchema = z.object({
  id: z.string().cuid(),
  type: AnnouncementTypeSchema,
  severity: AnnouncementSeveritySchema,
  title: z.string(),
  bodyMarkdown: z.string(),
  version: z.string().nullable(),
  dismissible: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
});
export type ActiveAnnouncement = z.infer<typeof ActiveAnnouncementSchema>;

/** Full announcement record for the admin console. */
export const AnnouncementSchema = z.object({
  id: z.string().cuid(),
  type: AnnouncementTypeSchema,
  severity: AnnouncementSeveritySchema,
  title: z.string(),
  bodyMarkdown: z.string(),
  version: z.string().nullable(),
  isPublished: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  dismissible: z.boolean(),
  createdByUserId: z.string().cuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Announcement = z.infer<typeof AnnouncementSchema>;

export const CreateAnnouncementSchema = z.object({
  type: AnnouncementTypeSchema.default('announcement'),
  severity: AnnouncementSeveritySchema.default('info'),
  title: z.string().trim().min(1).max(200),
  bodyMarkdown: z.string().trim().min(1).max(10000),
  version: z.string().trim().max(40).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  dismissible: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;

export const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial();
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
