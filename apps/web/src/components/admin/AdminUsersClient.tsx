'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { AdminUserListItem } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-store';
import { Modal } from '@/components/layout/Modal';

type SortKey = 'user' | 'tokens';
type SortDir = 'asc' | 'desc';

export function AdminUsersClient() {
  const t = useTranslations('admin');
  const tErr = useTranslations('errors.api');
  const tToast = useTranslations('toasts');
  const toast = useToast();
  const errText = (e: unknown) =>
    e instanceof ApiError ? tErr(e.code as never) : tToast('error');
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('user');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const pageSize = 20;

  const query = useQuery({
    queryKey: ['admin-users', token, search, page],
    queryFn: () => api.admin.listUsers(token ?? '', { search, page, pageSize }),
    enabled: Boolean(token),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users', token] });
  const mutation = useMutation({
    mutationFn: ({ fn }: { fn: () => Promise<unknown>; message: string }) => fn(),
    onSuccess: (_data, vars) => {
      invalidate();
      toast.success(vars.message);
    },
    onError: (e) => toast.error(errText(e)),
  });

  const run = (fn: () => Promise<unknown>, message: string) => mutation.mutate({ fn, message });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    run(() => api.admin.deleteUser(token ?? '', id), tToast('userDeleted'));
    setDeleteTarget(null);
  };

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const sortedItems = data?.items
    ? [...data.items].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'user') {
          cmp = (a.email ?? '').localeCompare(b.email ?? '');
        } else if (sortKey === 'tokens') {
          cmp = a.tokenUsage.totalTokens - b.tokenUsage.totalTokens;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data?.items;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 opacity-30">▲</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('users.searchPlaceholder')}
          className="input-field w-full max-w-xs"
        />
        {mutation.isError && <span className="text-sm text-state-error">{t('actionError')}</span>}
      </div>

      {query.isLoading ? (
        <p className="text-sm text-text-secondary">{t('loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle shadow-elev-1">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sunken sticky top-0 text-xs uppercase tracking-wide text-text-disabled">
              <tr>
                <th
                  className="cursor-pointer select-none px-3 py-2 hover:text-text-secondary"
                  onClick={() => toggleSort('user')}
                >
                  {t('users.user')}
                  <SortIndicator col="user" />
                </th>
                <th className="px-3 py-2">{t('users.status')}</th>
                <th className="px-3 py-2">{t('users.roles')}</th>
                <th
                  className="cursor-pointer select-none px-3 py-2 hover:text-text-secondary"
                  onClick={() => toggleSort('tokens')}
                >
                  {t('users.tokens')}
                  <SortIndicator col="tokens" />
                </th>
                <th className="px-3 py-2">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sortedItems?.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  busy={mutation.isPending}
                  t={t}
                  onBlock={() => run(() => api.admin.blockUser(token ?? '', u.id), tToast('userUpdated'))}
                  onUnblock={() => run(() => api.admin.unblockUser(token ?? '', u.id), tToast('userUpdated'))}
                  onGrant={() => run(() => api.admin.grantAdmin(token ?? '', u.id), tToast('userUpdated'))}
                  onRevoke={() => run(() => api.admin.revokeAdmin(token ?? '', u.id), tToast('userUpdated'))}
                  onVerify={() => run(() => api.admin.verifyUser(token ?? '', u.id), tToast('userUpdated'))}
                  onDelete={() => setDeleteTarget(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>{data ? t('users.total', { count: data.total }) : ''}</span>
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

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        closeLabel={t('users.cancel')}
        title={t('users.deleteConfirmTitle')}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {t('users.deleteConfirmBody', { name: deleteTarget?.displayName ?? deleteTarget?.email ?? '' })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="press rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:border-brand-accent hover:text-text-primary"
            >
              {t('users.cancel')}
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={confirmDelete}
              className="press rounded-md border border-state-error/40 bg-state-error/10 px-3 py-1.5 text-sm text-state-error transition hover:bg-state-error/20 disabled:opacity-50"
            >
              {t('users.deleteConfirmAction')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  busy,
  t,
  onBlock,
  onUnblock,
  onGrant,
  onRevoke,
  onVerify,
  onDelete,
}: {
  user: AdminUserListItem;
  isSelf: boolean;
  busy: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onBlock: () => void;
  onUnblock: () => void;
  onGrant: () => void;
  onRevoke: () => void;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const isAdmin = user.roles.includes('SYSTEM_ADMIN');
  const isBlocked = user.status === 'BLOCKED';
  const isPending = user.status === 'PENDING_VERIFICATION';

  return (
    <tr className="text-text-secondary transition odd:bg-white/[0.02] hover:bg-background-elevated/50">
      <td className="px-3 py-2">
        <div className="text-text-primary">{user.displayName}</div>
        <div className="text-xs text-text-disabled">{user.email}</div>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs">{user.status}</span>
      </td>
      <td className="px-3 py-2 text-xs">{user.roles.join(', ') || '—'}</td>
      <td className="px-3 py-2 text-xs">
        {user.tokenUsage.totalTokens.toLocaleString()}
        <span className="text-text-disabled"> ({user.tokenUsage.reportCount})</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {isBlocked ? (
            <ActionBtn onClick={onUnblock} disabled={busy}>{t('users.unblock')}</ActionBtn>
          ) : (
            <ActionBtn onClick={onBlock} disabled={busy || isSelf} variant="danger">
              {t('users.block')}
            </ActionBtn>
          )}
          {isAdmin ? (
            <ActionBtn onClick={onRevoke} disabled={busy}>{t('users.revokeAdmin')}</ActionBtn>
          ) : (
            <ActionBtn onClick={onGrant} disabled={busy}>{t('users.grantAdmin')}</ActionBtn>
          )}
          {isPending && <ActionBtn onClick={onVerify} disabled={busy}>{t('users.verify')}</ActionBtn>}
          <ActionBtn onClick={onDelete} disabled={busy || isSelf} variant="danger">
            {t('users.delete')}
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
        variant === 'danger'
          ? 'border-state-error/40 text-state-error hover:bg-state-error/10'
          : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}
