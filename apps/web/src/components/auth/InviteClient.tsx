'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Invitation landing page reached from the email link (?token=). Shows a
 * preview and, depending on auth state and whether the account email matches,
 * lets the user accept/decline, or prompts them to log in / register.
 */
export function InviteClient() {
  const t = useTranslations('sharing.invite');
  const tRel = useTranslations('sharing.relationships');
  const tLvl = useTranslations('sharing.levels');
  const router = useRouter();
  const queryClient = useQueryClient();

  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const authToken = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const userEmail = useAuthStore((s) => s.user?.email ?? null);

  const previewQ = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => api.invitations.preview(token),
    enabled: Boolean(token),
    retry: false,
  });

  const acceptM = useMutation({
    mutationFn: () => api.invitations.acceptToken(authToken ?? '', token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accessible-profiles'] });
      router.replace('/dashboard');
    },
  });
  const declineM = useMutation({
    mutationFn: () => api.invitations.declineToken(authToken ?? '', token),
  });

  const card = (children: React.ReactNode) => (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-text-primary">{t('title')}</h1>
      {children}
    </div>
  );

  if (!token || (previewQ.error instanceof ApiError)) {
    return card(<p className="text-sm text-state-error">{t('invalid')}</p>);
  }
  if (previewQ.isLoading || !previewQ.data) {
    return card(<p className="text-sm text-text-secondary">{t('loading')}</p>);
  }

  const preview = previewQ.data;

  if (preview.status === 'EXPIRED') {
    return card(<p className="text-sm text-state-error">{t('expired')}</p>);
  }
  if (preview.status !== 'PENDING') {
    return card(<p className="text-sm text-text-secondary">{t('invalid')}</p>);
  }

  const details = (
    <p className="text-sm text-text-secondary">
      {t('intro', { inviter: preview.inviterName, cabinet: preview.cabinetName })}
      <br />
      <span className="text-text-disabled">
        {t('role')}: {tRel(preview.relationship)} · {t('access')}: {tLvl(preview.accessLevel)}
      </span>
    </p>
  );

  // Logged in: accept/decline if the account email matches the invite.
  if (authToken && userEmail) {
    if (userEmail.toLowerCase() !== preview.email.toLowerCase()) {
      return card(
        <>
          {details}
          <p className="text-sm text-state-warning">{t('mismatch', { email: preview.email })}</p>
        </>,
      );
    }
    if (acceptM.isSuccess) {
      return card(<p className="text-sm text-state-success">{t('accepted')}</p>);
    }
    if (declineM.isSuccess) {
      return card(<p className="text-sm text-text-secondary">{t('declined')}</p>);
    }
    return card(
      <>
        {details}
        <div className="flex justify-center gap-2">
          <button className="btn-primary" onClick={() => acceptM.mutate()} disabled={acceptM.isPending} type="button">
            {t('accept')}
          </button>
          <button
            className="rounded-md border border-border-subtle px-4 py-2 text-sm text-text-secondary transition hover:text-state-error"
            onClick={() => declineM.mutate()}
            disabled={declineM.isPending}
            type="button"
          >
            {t('decline')}
          </button>
        </div>
      </>,
    );
  }

  // Logged out: prompt to register (new email) or log in (existing account).
  return card(
    <>
      {details}
      <p className="text-sm text-text-disabled">{preview.email}</p>
      {preview.requiresRegistration ? (
        <Link className="btn-primary inline-flex" href={`/register?invite=${token}` as never}>
          {t('register')}
        </Link>
      ) : (
        <Link className="btn-primary inline-flex" href="/login">
          {t('login')}
        </Link>
      )}
    </>,
  );
}
