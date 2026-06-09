import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANTHROPIC_MODELS,
  type AiSettings,
  type AiSettingsProvider,
  type UpdateAiSettingsInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import {
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
  maskSecret,
} from '../../common/crypto/secret-box';

const SETTING_ID = 'ai';
const DEFAULT_MODEL = 'claude-opus-4-8';

/** Effective AI configuration after merging the DB row with env fallbacks. */
export interface AiRuntime {
  provider: AiSettingsProvider;
  model: string;
  visionModel: string;
  apiKey: string | null;
}

/**
 * Single source of truth for AI provider/model/key. The DB row (AppSetting "ai")
 * takes precedence; env vars are the fallback so existing deployments keep
 * working before anything is set in the admin UI. Used at runtime by AiService
 * and DrillsService, and as the read/write backend for the admin settings page.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Resolve the effective AI runtime config. Returns provider 'none' when no usable key exists. */
  async getAiRuntime(): Promise<AiRuntime> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: SETTING_ID } });

    const provider = (row?.provider ?? this.config.get<string>('AI_PROVIDER') ?? 'none').toLowerCase();
    const apiKey = this.resolveApiKey(row?.apiKeyCipher ?? null);
    const model =
      row?.model ?? this.config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;
    const visionModel =
      row?.visionModel ??
      this.config.get<string>('AI_VISION_MODEL') ??
      row?.model ??
      this.config.get<string>('AI_MODEL') ??
      DEFAULT_MODEL;

    if (provider === 'anthropic' && apiKey) {
      return { provider: 'anthropic', model, visionModel, apiKey };
    }
    if (provider === 'local') {
      return { provider: 'local', model, visionModel, apiKey: null };
    }
    return { provider: 'none', model, visionModel, apiKey: null };
  }

  /** Admin read view — never returns the raw key. */
  async getView(): Promise<AiSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
    const dbKey = row?.apiKeyCipher ? this.tryDecrypt(row.apiKeyCipher) : null;
    const envKey = this.config.get<string>('AI_API_KEY') ?? null;
    const effectiveKey = dbKey ?? envKey;
    const apiKeySource: AiSettings['apiKeySource'] = dbKey ? 'db' : envKey ? 'env' : 'none';

    return {
      provider: (row?.provider as AiSettingsProvider) ?? 'none',
      model: row?.model ?? null,
      visionModel: row?.visionModel ?? null,
      apiKeySet: Boolean(effectiveKey),
      apiKeyHint: effectiveKey ? maskSecret(effectiveKey) : null,
      apiKeySource,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      models: ANTHROPIC_MODELS.map((m) => ({ ...m })),
    };
  }

  /** Persist changes from the admin UI. Encrypts the key when provided. */
  async update(actorUserId: string, input: UpdateAiSettingsInput): Promise<AiSettings> {
    const data: {
      provider?: string;
      model?: string | null;
      visionModel?: string | null;
      apiKeyCipher?: string | null;
      updatedById: string;
    } = { updatedById: actorUserId };

    if (input.provider !== undefined) data.provider = input.provider;
    if (input.model !== undefined) data.model = input.model;
    if (input.visionModel !== undefined) data.visionModel = input.visionModel;
    if (input.apiKey !== undefined) {
      // Empty string clears the stored key; a value replaces it. Omitted leaves it untouched.
      data.apiKeyCipher = input.apiKey === '' ? null : encryptSecret(input.apiKey);
    }

    await this.prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      create: {
        id: SETTING_ID,
        provider: data.provider ?? 'none',
        model: data.model ?? null,
        visionModel: data.visionModel ?? null,
        apiKeyCipher: data.apiKeyCipher ?? null,
        updatedById: actorUserId,
      },
      update: data,
    });

    return this.getView();
  }

  private resolveApiKey(cipher: string | null): string | null {
    if (cipher) {
      const decrypted = this.tryDecrypt(cipher);
      if (decrypted) return decrypted;
    }
    return this.config.get<string>('AI_API_KEY') ?? null;
  }

  private tryDecrypt(cipher: string): string | null {
    if (!isEncryptionConfigured()) {
      this.logger.warn('SETTINGS_ENC_KEY not set — stored API key cannot be decrypted.');
      return null;
    }
    try {
      return decryptSecret(cipher);
    } catch (error) {
      this.logger.error(`Failed to decrypt stored API key: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }
}
