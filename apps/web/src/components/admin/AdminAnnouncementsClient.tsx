'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { AnnouncementSeverity, AnnouncementType, CreateAnnouncementInput } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const TYPES: AnnouncementType[] = ['announcement', 'release_note', 'maintenance'];
const SEVERITIES: AnnouncementSeverity[] = ['info', 'warning', 'critical'];

const emptyForm: CreateAnnouncementInput = {
  type: 'announcement',
  severity: 'info',
  title: '',
  bodyMarkdown: '',
  dismissible: true,
  isPublished: false,
};

export function AdminAnnouncementsClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateAnnouncementInput>(emptyForm);

  const query = useQuery({
    queryKey: ['admin-announcements', token],
    queryFn: () => api.admin.listAnnouncements(token ?? ''),
    enabled: Boolean(token),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-announcements', token] });

  const create = useMutation({
    mutationFn: () => api.admin.createAnnouncement(token ?? '', form),
    onSuccess: () => {
      setForm(emptyForm);
      invalidate();
    },
  });
  const action = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: invalidate });

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="surface flex flex-col gap-3 rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold text-text-primary">{t('announcements.createTitle')}</h2>
        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t('announcements.fieldTitle')}
          className={inputClass}
        />
        <textarea
          required
          value={form.bodyMarkdown}
          onChange={(e) => setForm((f) => ({ ...f, bodyMarkdown: e.target.value }))}
          placeholder={t('announcements.fieldBody')}
          rows={3}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
            className={inputClass + ' max-w-[180px]'}
          >
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`announcements.type.${x}`)}
              </option>
            ))}
          </select>
          <select
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as AnnouncementSeverity }))}
            className={inputClass + ' max-w-[180px]'}
          >
            {SEVERITIES.map((x) => (
              <option key={x} value={x}>
                {t(`announcements.severity.${x}`)}
              </option>
            ))}
          </select>
          <input
            value={form.version ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value || undefined }))}
            placeholder={t('announcements.fieldVersion')}
            className={inputClass + ' max-w-[140px]'}
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            {t('announcements.publishNow')}
          </label>
        </div>
        <button type="submit" disabled={create.isPending} className="btn-primary w-fit px-5">
          {t('announcements.create')}
        </button>
      </form>

      {query.isLoading ? (
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {query.data?.map((a) => (
            <li key={a.id} className="surface flex items-start justify-between gap-3 rounded-xl p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {a.title}
                  {a.version && <span className="ml-2 text-xs text-text-disabled">{a.version}</span>}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{a.bodyMarkdown}</p>
                <p className="mt-1 text-xs text-text-disabled">
                  {t(`announcements.type.${a.type}`)} · {t(`announcements.severity.${a.severity}`)} ·{' '}
                  {a.isPublished ? t('announcements.published') : t('announcements.draft')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {a.isPublished ? (
                  <ActionBtn onClick={() => action.mutate(() => api.admin.unpublishAnnouncement(token ?? '', a.id))}>
                    {t('announcements.unpublish')}
                  </ActionBtn>
                ) : (
                  <ActionBtn onClick={() => action.mutate(() => api.admin.publishAnnouncement(token ?? '', a.id))}>
                    {t('announcements.publish')}
                  </ActionBtn>
                )}
                <ActionBtn
                  variant="danger"
                  onClick={() => action.mutate(() => api.admin.deleteAnnouncement(token ?? '', a.id))}
                >
                  {t('announcements.delete')}
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
