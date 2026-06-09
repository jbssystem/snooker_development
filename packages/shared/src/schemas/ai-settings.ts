import { z } from 'zod';

/** AI provider the platform can be pointed at. */
export const AiSettingsProviderSchema = z.enum(['none', 'local', 'anthropic']);
export type AiSettingsProvider = z.infer<typeof AiSettingsProviderSchema>;

/**
 * Curated list of Anthropic models offered in the admin model picker. Kept in
 * sync with platform.claude.com/docs/en/about-claude/models/overview. The first
 * entry is the recommended default. `id` is the exact API model string — do not
 * append date suffixes.
 */
export const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', tier: 'opus', recommended: true },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', tier: 'opus', recommended: false },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', tier: 'opus', recommended: false },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'sonnet', recommended: false },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'haiku', recommended: false },
] as const;

export const ANTHROPIC_MODEL_IDS = ANTHROPIC_MODELS.map((m) => m.id) as [string, ...string[]];

export const AnthropicModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  tier: z.enum(['opus', 'sonnet', 'haiku']),
  recommended: z.boolean(),
});
export type AnthropicModelOption = z.infer<typeof AnthropicModelOptionSchema>;

/** Read view returned to the admin UI. The API key is never echoed back. */
export const AiSettingsSchema = z.object({
  provider: AiSettingsProviderSchema,
  model: z.string().nullable(),
  visionModel: z.string().nullable(),
  /** Whether an API key is currently stored (encrypted). The key itself is never returned. */
  apiKeySet: z.boolean(),
  /** Masked hint for a stored key, e.g. "sk-ant-…7Xb2". Null when no key is set. */
  apiKeyHint: z.string().nullable(),
  /** Source of the effective key: 'db' (set via admin), 'env' (fallback), or 'none'. */
  apiKeySource: z.enum(['db', 'env', 'none']),
  updatedAt: z.string().datetime().nullable(),
  models: z.array(AnthropicModelOptionSchema),
});
export type AiSettings = z.infer<typeof AiSettingsSchema>;

/**
 * Update payload. Every field is optional so the form can patch individually.
 * `apiKey`: omit to leave unchanged, empty string to clear, a value to replace.
 */
export const UpdateAiSettingsSchema = z
  .object({
    provider: AiSettingsProviderSchema.optional(),
    model: z.enum(ANTHROPIC_MODEL_IDS).nullable().optional(),
    visionModel: z.enum(ANTHROPIC_MODEL_IDS).nullable().optional(),
    apiKey: z.string().trim().max(200).optional(),
  })
  .strict();
export type UpdateAiSettingsInput = z.infer<typeof UpdateAiSettingsSchema>;
