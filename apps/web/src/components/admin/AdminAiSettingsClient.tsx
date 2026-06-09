'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { AiSettingsProvider, UpdateAiSettingsInput } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const inputClass =
  'min-h-10 rounded-md border border-border-subtle bg-background-elevated px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-border-active';

const PROVIDERS: AiSettingsProvider[] = ['none', 'local', 'anthropic'];

export function AdminAiSettingsClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-ai-settings', token],
    queryFn: () => api.admin.getAiSettings(token ?? ''),
    enabled: Boolean(token),
  });

  const [provider, setProvider] = useState<AiSettingsProvider>('none');
  const [model, setModel] = useState<string>('');
  const [visionModel, setVisionModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  // Hydrate the form once settings arrive. The key field stays empty — it is
  // write-only and never returned by the API.
  useEffect(() => {
    if (!query.data) return;
    setProvider(query.data.provider);
    setModel(query.data.model ?? '');
    setVisionModel(query.data.visionModel ?? '');
  }, [query.data]);

  const save = useMutation({
    mutationFn: (input: UpdateAiSettingsInput) => api.admin.updateAiSettings(token ?? '', input),
    onSuccess: () => {
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['admin-ai-settings', token] });
    },
  });

  if (query.isLoading) return <p className="text-sm text-text-secondary">{t('loading')}</p>;
  if (query.isError || !query.data)
    return <p className="text-sm text-state-error">{t('loadError')}</p>;

  const data = query.data;

  const submit = (clearKey = false) => {
    const input: UpdateAiSettingsInput = {
      provider,
      model: (model || null) as UpdateAiSettingsInput['model'],
      visionModel: (visionModel || null) as UpdateAiSettingsInput['visionModel'],
    };
    if (clearKey) input.apiKey = '';
    else if (apiKey.trim()) input.apiKey = apiKey.trim();
    save.mutate(input);
  };

  const sourceLabel = t(`aiSettings.source.${data.apiKeySource}`);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-text-secondary">{t('aiSettings.description')}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="surface flex flex-col gap-5 rounded-xl p-5 shadow-elev-1"
      >
        {/* Provider */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-disabled">
            {t('aiSettings.provider')}
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiSettingsProvider)}
            className={inputClass}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {t(`aiSettings.providers.${p}`)}
              </option>
            ))}
          </select>
        </label>

        {/* Model */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-disabled">
            {t('aiSettings.model')}
          </span>
          <select value={model} onChange={(e) => setModel(e.target.value)} className={inputClass}>
            <option value="">{t('aiSettings.modelDefault')}</option>
            {data.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.recommended ? ` · ${t('aiSettings.recommended')}` : ''}
              </option>
            ))}
          </select>
        </label>

        {/* Vision model */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-disabled">
            {t('aiSettings.visionModel')}
          </span>
          <select
            value={visionModel}
            onChange={(e) => setVisionModel(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('aiSettings.modelDefault')}</option>
            {data.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-disabled">{t('aiSettings.visionModelHint')}</span>
        </label>

        {/* API key */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-disabled">
            {t('aiSettings.apiKey')}
          </span>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {data.apiKeySet ? (
              <span className="sunken rounded-md border border-border-subtle px-2 py-1">
                {data.apiKeyHint} · {sourceLabel}
              </span>
            ) : (
              <span className="text-state-warning">{t('aiSettings.noKey')}</span>
            )}
          </div>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('aiSettings.apiKeyPlaceholder')}
            className={inputClass}
          />
          <span className="text-xs text-text-disabled">{t('aiSettings.apiKeyHint')}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="min-h-10 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-elev-1 transition hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? t('aiSettings.saving') : t('aiSettings.save')}
          </button>
          {data.apiKeySet && data.apiKeySource === 'db' && (
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit(true)}
              className="min-h-10 rounded-md border border-border-subtle px-4 py-2 text-sm text-text-secondary transition hover:text-state-error disabled:opacity-50"
            >
              {t('aiSettings.clearKey')}
            </button>
          )}
          {save.isSuccess && <span className="text-xs text-state-success">{t('aiSettings.saved')}</span>}
          {save.isError && <span className="text-xs text-state-error">{t('aiSettings.saveError')}</span>}
        </div>

        {data.updatedAt && (
          <p className="text-xs text-text-disabled">
            {t('aiSettings.updatedAt', { date: new Date(data.updatedAt).toLocaleString() })}
          </p>
        )}
      </form>
    </div>
  );
}
