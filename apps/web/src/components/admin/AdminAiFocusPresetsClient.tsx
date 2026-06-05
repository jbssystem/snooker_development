'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { CreateAiFocusPresetInput } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const emptyForm: CreateAiFocusPresetInput = {
  slug: '',
  label: { ru: '', en: '', uk: '' },
  promptInstruction: '',
  sortOrder: 0,
  isActive: true,
};

export function AdminAiFocusPresetsClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateAiFocusPresetInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin-ai-focus-presets', token],
    queryFn: () => api.admin.listAiFocusPresets(token ?? ''),
    enabled: Boolean(token),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-ai-focus-presets', token] });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? api.admin.updateAiFocusPreset(token ?? '', editingId, form)
        : api.admin.createAiFocusPreset(token ?? '', form),
    onSuccess: () => {
      resetForm();
      invalidate();
    },
  });
  const action = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: invalidate });

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="surface flex flex-col gap-3 rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold text-text-primary">
          {editingId ? t('aiFocusPresets.editTitle') : t('aiFocusPresets.createTitle')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder={t('aiFocusPresets.fieldSlug')}
            className={inputClass + ' max-w-[200px]'}
          />
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
            placeholder={t('aiFocusPresets.fieldSortOrder')}
            className={inputClass + ' max-w-[120px]'}
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            {t('aiFocusPresets.active')}
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={form.label.ru}
            onChange={(e) => setForm((f) => ({ ...f, label: { ...f.label, ru: e.target.value } }))}
            placeholder={t('aiFocusPresets.labelRu')}
            className={inputClass}
          />
          <input
            required
            value={form.label.en}
            onChange={(e) => setForm((f) => ({ ...f, label: { ...f.label, en: e.target.value } }))}
            placeholder={t('aiFocusPresets.labelEn')}
            className={inputClass}
          />
          <input
            required
            value={form.label.uk}
            onChange={(e) => setForm((f) => ({ ...f, label: { ...f.label, uk: e.target.value } }))}
            placeholder={t('aiFocusPresets.labelUk')}
            className={inputClass}
          />
        </div>
        <textarea
          required
          value={form.promptInstruction}
          onChange={(e) => setForm((f) => ({ ...f, promptInstruction: e.target.value }))}
          placeholder={t('aiFocusPresets.fieldInstruction')}
          rows={3}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button type="submit" disabled={save.isPending} className="btn-primary w-fit px-5">
            {editingId ? t('aiFocusPresets.update') : t('aiFocusPresets.create')}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="press rounded-md border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:border-brand-accent hover:text-text-primary">
              {t('aiFocusPresets.cancel')}
            </button>
          )}
        </div>
      </form>

      {query.isLoading ? (
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {query.data?.map((preset) => (
            <li key={preset.id} className="surface flex items-start justify-between gap-3 rounded-xl p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {preset.label.ru}
                  <span className="ml-2 font-mono text-xs text-text-disabled">{preset.slug}</span>
                  {!preset.isActive && (
                    <span className="ml-2 rounded bg-background-elevated px-1.5 py-0.5 text-xs text-text-disabled">
                      {t('aiFocusPresets.inactive')}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{preset.promptInstruction}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <ActionBtn
                  onClick={() => {
                    setEditingId(preset.id);
                    setForm({
                      slug: preset.slug,
                      label: preset.label,
                      promptInstruction: preset.promptInstruction,
                      sortOrder: preset.sortOrder,
                      isActive: preset.isActive,
                    });
                  }}
                >
                  {t('aiFocusPresets.edit')}
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  onClick={() => action.mutate(() => api.admin.deleteAiFocusPreset(token ?? '', preset.id))}
                >
                  {t('aiFocusPresets.delete')}
                </ActionBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputClass = 'input-field w-full';

function ActionBtn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press rounded-md border px-2.5 py-1 text-xs transition ${
        variant === 'danger'
          ? 'border-state-error/40 text-state-error hover:bg-state-error/10'
          : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}
