'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

export function AdminStatsClient() {
  const t = useTranslations('admin');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const query = useQuery({
    queryKey: ['admin-stats', token],
    queryFn: () => api.admin.getStats(token ?? ''),
    enabled: Boolean(token),
  });

  if (query.isLoading) return <p className="text-sm text-text-secondary">{t('loading')}</p>;
  if (query.isError || !query.data) return <p className="text-sm text-state-error">{t('loadError')}</p>;
  const s = query.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('stats.totalUsers')} value={s.totalUsers} />
        <StatCard label={t('stats.totalAdmins')} value={s.totalAdmins} />
        <StatCard label={t('stats.totalReports')} value={s.totalReports} />
        <StatCard label={t('stats.tokensThisMonth')} value={s.tokensThisMonth.toLocaleString()} />
      </div>

      <section className="surface rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">{t('stats.byStatus')}</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.usersByStatus).map(([status, count]) => (
            <span
              key={status}
              className="rounded-md border border-border-subtle bg-background-secondary px-3 py-1.5 text-xs text-text-secondary"
            >
              {status}: <span className="text-text-primary">{count}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="surface rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">{t('stats.recentSignups')}</h2>
        <ul className="flex flex-col divide-y divide-border-subtle">
          {s.recentSignups.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="text-text-primary">{u.displayName}</span>{' '}
                <span className="text-text-disabled">{u.email}</span>
              </span>
              <span className="shrink-0 text-xs text-text-secondary">
                {new Date(u.createdAt).toLocaleDateString()} · {u.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface rounded-xl p-5">
      <p className="text-xs uppercase tracking-wide text-text-disabled">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
