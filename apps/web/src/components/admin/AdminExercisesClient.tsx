'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { DrillVisibility } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const VISIBILITIES: DrillVisibility[] = ['private', 'shared', 'system'];

export function AdminExercisesClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  return (
    <div className="flex flex-col gap-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('exercises.searchPlaceholder')}
        className="w-full max-w-xs rounded-md border border-border-subtle bg-background-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none"
      />
      {query.isLoading ? (
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-background-secondary text-xs uppercase tracking-wide text-text-disabled">
              <tr>
                <th className="px-3 py-2">{t('exercises.name')}</th>
                <th className="px-3 py-2">{t('exercises.category')}</th>
                <th className="px-3 py-2">{t('exercises.visibility')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {query.data?.map((d) => (
                <tr key={d.id} className="text-text-secondary">
                  <td className="px-3 py-2 text-text-primary">{d.name}</td>
                  <td className="px-3 py-2 text-xs">{d.category}</td>
                  <td className="px-3 py-2">
                    <select
                      value={d.visibility}
                      disabled={setVisibility.isPending}
                      onChange={(e) =>
                        setVisibility.mutate({ id: d.id, visibility: e.target.value as DrillVisibility })
                      }
                      className="rounded-md border border-border-subtle bg-background-secondary px-2 py-1 text-xs text-text-primary focus:border-border-active focus:outline-none"
                    >
                      {VISIBILITIES.map((v) => (
                        <option key={v} value={v}>
                          {t(`exercises.visibilityOption.${v}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
