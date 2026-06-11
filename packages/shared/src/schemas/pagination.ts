import { z } from 'zod';

/**
 * Cursor pagination for list endpoints. The response stays a plain array of
 * items (newest first). A full page (`items.length === limit`) signals that
 * more items may exist — pass the last item's `id` as `cursor` to fetch the
 * next page.
 */
export const ListCursorQuerySchema = z.object({
  cursor: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListCursorQuery = z.infer<typeof ListCursorQuerySchema>;
