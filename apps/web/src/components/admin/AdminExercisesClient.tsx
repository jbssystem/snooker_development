'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import type { DrillVisibility } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const VISIBILITIES: DrillVisibility[] = ['private', 'shared', 'system'];
const PAGE_SIZE = 20;

export function AdminExercisesClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin-drills', token, search],
    queryFn: () => api.admin.listDrills(token ?? '', search || undefined),
    enabled: Boolean(token),
  });

  const setVisibility = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: DrillVisibility }) =>
      api.admin.setDrillVisibility(token ?? '', id, visibility),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-drills', token] }),
  });

  const setHidden = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      api.admin.setDrillHidden(token ?? '', id, hidden),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-drills', token] }),
  });

  const allItems = query.data ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allItems, page],
  );

  return (
    <div className="flex flex-col gap-4">
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={t('exercises.searchPlaceholder')}
        className="input-field w-full max-w-xs"
      />
      {query.isLoading ? (
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle shadow-elev-1">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sunken sticky top-0 text-xs uppercase tracking-wide text-text-disabled">
              <tr>
                <th className="px-3 py-2">{t('exercises.name')}</th>
                <th className="px-3 py-2">{t('exercises.category')}</th>
                <th className="px-3 py-2">{t('exercises.visibility')}</th>
                <th className="px-3 py-2">{t('exercises.hidden')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {pageItems.map((d) => (
                <tr
                  key={d.id}
                  className={`text-text-secondary transition odd:bg-white/[0.02] hover:bg-background-elevated/50 ${
                    d.isHidden ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-text-primary">{d.name}</td>
                  <td className="px-3 py-2 text-xs">{d.category}</td>
                  <td className="px-3 py-2">
                    <select
                      value={d.visibility}
                      disabled={setVisibility.isPending}
                      onChange={(e) =>
                        setVisibility.mutate({ id: d.id, visibility: e.target.value as DrillVisibility })
                      }
                      className="input-field max-w-[180px] py-1 text-xs"
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {t(`exercises.visibilityOption.${v}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={setHidden.isPending}
                      onClick={() => setHidden.mutate({ id: d.id, hidden: !d.isHidden })}
                      className="press rounded-md border border-border-subtle px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {d.isHidden ? t('exercises.unhideAction') : t('exercises.hideAction')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>{allItems.length > 0 ? t('users.total', { count: allItems.length }) : ''}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="press rounded-md border border-border-subtle px-3 py-1.5 disabled:opacity-50"
          >
            ‹
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="press rounded-md border border-border-subtle px-3 py-1.5 disabled:opacity-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
