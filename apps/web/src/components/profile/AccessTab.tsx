'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { AccessLevel, CreateInvitationInput, MembershipRelationship } from '@snooker/shared';
import { api, ApiError } from '@/lib/api-client';

const RELATIONSHIPS: MembershipRelationship[] = ['COACH', 'PARENT', 'GUEST'];
const LEVELS: AccessLevel[] = ['VIEW', 'EDIT'];

/**
 * Owner-only access management for the active cabinet: invite people, manage
 * members' permissions, and revoke pending invitations. Also surfaces
 * invitations addressed to the current user.
 */
export function AccessTab({ token }: { token: string }) {
  const t = useTranslations('sharing.access');
  const tRel = useTranslations('sharing.relationships');
  const tLvl = useTranslations('sharing.levels');
  const tErr = useTranslations('errors.api');
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<MembershipRelationship>('COACH');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VIEW');
  const [wellness, setWellness] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const membersQ = useQuery({
    queryKey: ['cabinet-members', token],
    queryFn: () => api.profiles.listMembers(token),
    enabled: Boolean(token),
  });
  const invitationsQ = useQuery({
    queryKey: ['cabinet-invitations', token],
    queryFn: () => api.profiles.listInvitations(token),
    enabled: Boolean(token),
  });
  const incomingQ = useQuery({
    queryKey: ['incoming-invitations', token],
    queryFn: () => api.invitations.incoming(token),
    enabled: Boolean(token),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['cabinet-members', token] });
    void queryClient.invalidateQueries({ queryKey: ['cabinet-invitations', token] });
  };

  const errText = (e: unknown) =>
    e instanceof ApiError ? tErr(e.code as never) : tErr('generic.internal' as never);

  const inviteM = useMutation({
    mutationFn: (input: CreateInvitationInput) => api.profiles.invite(token, input),
    onSuccess: () => {
      setSent(true);
      setEmail('');
      setError(null);
      refresh();
    },
    onError: (e) => {
      setSent(false);
      setError(errText(e));
    },
  });
  const revokeM = useMutation({
    mutationFn: (id: string) => api.profiles.revokeInvitation(token, id),
    onSuccess: refresh,
  });
  const removeM = useMutation({
    mutationFn: (userId: string) => api.profiles.removeMember(token, userId),
    onSuccess: refresh,
  });
  const updateM = useMutation({
    mutationFn: ({ userId, accessLevel: level }: { userId: string; accessLevel: AccessLevel }) =>
      api.profiles.updateMember(token, userId, { accessLevel: level }),
    onSuccess: refresh,
  });
  const acceptM = useMutation({
    mutationFn: (id: string) => api.invitations.acceptIncoming(token, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incoming-invitations', token] });
      void queryClient.invalidateQueries({ queryKey: ['accessible-profiles'] });
    },
  });
  const declineM = useMutation({
    mutationFn: (id: string) => api.invitations.declineIncoming(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incoming-invitations', token] }),
  });

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteM.mutate({ email: email.trim(), relationship, accessLevel, canAccessWellness: wellness });
  };

  const incoming = incomingQ.data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      </header>

      {/* Invitations addressed to me */}
      {incoming.length > 0 && (
        <section className="surface rounded-xl p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('incoming')}</h3>
          <ul className="mt-3 space-y-2">
            {incoming.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2">
                <span className="text-sm text-text-primary">
                  {inv.cabinetName} · {tRel(inv.relationship)} · {tLvl(inv.accessLevel)}
                </span>
                <span className="flex gap-2">
                  <button className="btn-primary px-3 py-1.5 text-sm" onClick={() => acceptM.mutate(inv.id)} type="button">
                    {t('accept')}
                  </button>
                  <button className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:text-state-error" onClick={() => declineM.mutate(inv.id)} type="button">
                    {t('decline')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invite form */}
      <section className="surface rounded-xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('inviteTitle')}</h3>
        <form className="mt-3 space-y-3" onSubmit={onInvite}>
          <div>
            <label className="mb-1 block text-sm text-text-secondary" htmlFor="invite-email">{t('emailLabel')}</label>
            <input
              id="invite-email"
              type="email"
              required
              className="input-field"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary" htmlFor="invite-rel">{t('relationship')}</label>
              <select id="invite-rel" className="input-field" value={relationship} onChange={(e) => setRelationship(e.target.value as MembershipRelationship)}>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{tRel(r)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary" htmlFor="invite-level">{t('accessLevel')}</label>
              <select id="invite-level" className="input-field" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{tLvl(l)}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="mt-1" checked={wellness} onChange={(e) => setWellness(e.target.checked)} />
            <span>
              {t('wellness')}
              <span className="block text-xs text-text-disabled">{t('wellnessHint')}</span>
            </span>
          </label>
          {error && <p className="text-sm text-state-error">{error}</p>}
          {sent && <p className="text-sm text-state-success">{t('inviteSent')}</p>}
          <button className="btn-primary" type="submit" disabled={inviteM.isPending}>
            {inviteM.isPending ? t('sending') : t('send')}
          </button>
        </form>
      </section>

      {/* Members */}
      <section className="surface rounded-xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('members')}</h3>
        {membersQ.data && membersQ.data.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {membersQ.data.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-text-primary">{m.displayName}</span>
                  <span className="block truncate text-xs text-text-disabled">
                    {m.email} · {tRel(m.relationship)} · {tLvl(m.accessLevel)}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
                    onClick={() => updateM.mutate({ userId: m.userId, accessLevel: m.accessLevel === 'EDIT' ? 'VIEW' : 'EDIT' })}
                    type="button"
                  >
                    {m.accessLevel === 'EDIT' ? tLvl('VIEW') : tLvl('EDIT')}
                  </button>
                  <button
                    className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary transition hover:text-state-error"
                    onClick={() => removeM.mutate(m.userId)}
                    type="button"
                  >
                    {t('remove')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-disabled">{t('noMembers')}</p>
        )}
      </section>

      {/* Pending invitations */}
      <section className="surface rounded-xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('pending')}</h3>
        {invitationsQ.data && invitationsQ.data.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {invitationsQ.data.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-text-primary">{inv.email}</span>
                  <span className="block truncate text-xs text-text-disabled">
                    {tRel(inv.relationship)} · {tLvl(inv.accessLevel)}
                  </span>
                </span>
                <button
                  className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary transition hover:text-state-error"
                  onClick={() => revokeM.mutate(inv.id)}
                  type="button"
                >
                  {t('revoke')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-disabled">{t('noPending')}</p>
        )}
      </section>
    </div>
  );
}
