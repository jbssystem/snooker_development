'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateEquipmentProfileInput, EquipmentProfile, UpsertPlayerProfileInput } from '@snooker/shared';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { CountryOptions, Field, PageHeader } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { useActiveProfile } from '@/lib/use-active-profile';
import { AvatarPicker } from './AvatarPicker';
import { PlayerAvatar } from './PlayerAvatar';
import { AccessTab } from './AccessTab';

type ProfileTab = 'player' | 'equipment' | 'settings' | 'access';

// Predefined player skill levels offered in the profile dropdown. Stored as the
// raw key string (the `level` field is free-form text in the schema).
const levelOptions = ['beginner', 'amateur', 'intermediate', 'advanced', 'semiPro', 'professional'] as const;

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  dominantHand: '' | 'LEFT' | 'RIGHT' | 'AMBIDEXTROUS';
  level: string;
  seasonGoal: string;
  avatar: string;
};

type EquipmentFormValues = {
  cueName: string;
  cueWeight: string;
  tipBrand: string;
  tipSize: string;
  tipChangeDate: string;
  extension: string;
  chalk: string;
  notes: string;
  activeFrom: string;
};

const profileDefaults: ProfileFormValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  country: '',
  dominantHand: '',
  level: '',
  seasonGoal: '',
  avatar: '',
};

const equipmentDefaults: EquipmentFormValues = {
  cueName: '',
  cueWeight: '',
  tipBrand: '',
  tipSize: '',
  tipChangeDate: '',
  extension: '',
  chalk: '',
  notes: '',
  activeFrom: today(),
};

export function ProfileClient() {
  const t = useTranslations('profile');
  const tErr = useTranslations('errors.api');
  const queryClient = useQueryClient();
  const tokens = useAuthStore((s) => s.tokens);
  const token = tokens?.accessToken ?? null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('player');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const tAccess = useTranslations('sharing.access');
  // Access management is only for the owner of the active cabinet.
  const activeProfile = useActiveProfile();
  const isOwner = Boolean(activeProfile?.isOwner);

  // Language switching (relocated here from the header / user menu).
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const rawPathname = usePathname() ?? `/${locale}`;
  const normalizedPathname = useMemo(() => withoutLocalePrefix(rawPathname), [rawPathname]);
  const userEmail = useAuthStore((s) => s.user?.email ?? '');

  const profileForm = useForm<ProfileFormValues>({ defaultValues: profileDefaults });
  const equipmentForm = useForm<EquipmentFormValues>({ defaultValues: equipmentDefaults });
  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
  });

  const equipmentQuery = useQuery({
    queryKey: ['equipment-profiles', token],
    queryFn: () => api.players.listEquipment(token ?? ''),
    enabled: Boolean(token && profileQuery.data),
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    profileForm.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: toDateInput(profile.dateOfBirth),
      country: profile.country && profile.country.length === 2 ? profile.country.toUpperCase() : '',
      dominantHand: profile.dominantHand ?? '',
      level: profile.level ?? '',
      seasonGoal: profile.seasonGoal ?? '',
      avatar: profile.avatar ?? '',
    });
  }, [profileForm, profileQuery.data]);

  const saveProfile = useMutation({
    mutationFn: (input: UpsertPlayerProfileInput) => api.players.upsertProfile(token ?? '', input),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['player-profile'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-profiles'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const addEquipment = useMutation({
    mutationFn: (input: CreateEquipmentProfileInput) => api.players.createEquipment(token ?? '', input),
    onSuccess: () => {
      setServerError(null);
      equipmentForm.reset(equipmentDefaults);
      queryClient.invalidateQueries({ queryKey: ['equipment-profiles'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const deleteEquipment = useMutation({
    mutationFn: (id: string) => api.players.deleteEquipment(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment-profiles'] }),
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const saveAvatar = useMutation({
    mutationFn: (avatar: string) => api.players.updateAvatar(token ?? '', avatar),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['player-profile'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const changePassword = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.auth.changePassword(token ?? '', input),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSaved(true);
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e) => {
      setPasswordSaved(false);
      setPasswordError(errorMessage(e, tErr));
    },
  });

  const submitPassword = (values: PasswordFormValues) => {
    setPasswordSaved(false);
    if (values.newPassword !== values.confirmPassword) {
      setPasswordError(t('settings.password.mismatch'));
      return;
    }
    setPasswordError(null);
    changePassword.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  };

  const equipmentItems = useMemo(() => equipmentQuery.data ?? [], [equipmentQuery.data]);
  // "Current" = still in use (no end date); "history" = retired items.
  const currentItems = useMemo(() => equipmentItems.filter((item) => !item.activeTo), [equipmentItems]);
  const historyItems = useMemo(() => equipmentItems.filter((item) => Boolean(item.activeTo)), [equipmentItems]);
  const avatarValue = profileForm.watch('avatar');
  const levelValue = profileForm.watch('level');
  // Keep legacy free-text levels selectable so saved profiles don't lose data.
  const isCustomLevel = Boolean(levelValue) && !(levelOptions as readonly string[]).includes(levelValue);
  const fullName = [profileForm.watch('firstName'), profileForm.watch('lastName')]
    .filter(Boolean)
    .join(' ')
    .trim();

  const persistAvatar = (value: string) => {
    profileForm.setValue('avatar', value, { shouldDirty: true });
    if (profileQuery.data) {
      saveAvatar.mutate(value);
    }
  };

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: 'player', label: t('tabs.player') },
    { id: 'equipment', label: t('tabs.equipment'), count: currentItems.length },
    { id: 'settings', label: t('tabs.settings') },
    ...(isOwner ? [{ id: 'access' as const, label: tAccess('tab') }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl">
      <PageHeader subtitle={t('subtitle')} title={t('title')} />

      <div className="sunken mb-6 flex gap-1 rounded-lg p-1" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            aria-selected={tab === item.id}
            className={`press focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === item.id
                ? 'bg-background-elevated text-brand-accent shadow-elev-1 ring-1 ring-brand-accent/30'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-background-sunken px-1.5 text-[11px] tabular-nums text-text-disabled">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <section className={tab === 'player' ? '' : 'hidden'}>
        <div className="surface mb-6 flex items-center gap-4 rounded-xl p-4 sm:p-5">
          <button
            aria-label={t('avatar.edit')}
            className="press group relative rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-active"
            onClick={() => setAvatarOpen(true)}
            type="button"
          >
            <PlayerAvatar avatar={avatarValue} className="h-20 w-20 ring-2 ring-border-subtle transition group-hover:ring-brand-accent" name={fullName} />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-xs font-medium text-text-primary opacity-0 transition group-hover:opacity-100">
              {t('avatar.edit')}
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-text-primary">{fullName || t('avatar.noName')}</p>
            <button className="mt-1 text-sm text-brand-accent hover:underline" onClick={() => setAvatarOpen(true)} type="button">
              {t('avatar.edit')}
            </button>
          </div>
        </div>

        <form
          className="grid gap-4 surface rounded-xl p-5 sm:grid-cols-2"
          onSubmit={profileForm.handleSubmit((values) => saveProfile.mutate(toProfilePayload(values)))}
        >
          <Field
            error={profileForm.formState.errors.firstName?.message}
            label={t('fields.firstName')}
          >
            <input
              className={inputClass}
              placeholder={t('placeholders.firstName')}
              {...profileForm.register('firstName', { required: t('required') })}
            />
          </Field>
          <Field
            error={profileForm.formState.errors.lastName?.message}
            label={t('fields.lastName')}
          >
            <input
              className={inputClass}
              placeholder={t('placeholders.lastName')}
              {...profileForm.register('lastName', { required: t('required') })}
            />
          </Field>
          <Field label={t('fields.dateOfBirth')}>
            <input className={inputClass} type="date" {...profileForm.register('dateOfBirth')} />
          </Field>
          <Field label={t('fields.country')}>
            <select className={inputClass} {...profileForm.register('country')}>
              <CountryOptions placeholder={t('placeholders.country')} />
            </select>
          </Field>
          <Field label={t('fields.dominantHand')}>
            <select className={inputClass} {...profileForm.register('dominantHand')}>
              <option value="">{t('dominantHand.empty')}</option>
              <option value="RIGHT">{t('dominantHand.RIGHT')}</option>
              <option value="LEFT">{t('dominantHand.LEFT')}</option>
              <option value="AMBIDEXTROUS">{t('dominantHand.AMBIDEXTROUS')}</option>
            </select>
          </Field>
          <Field label={t('fields.level')}>
            <select className={inputClass} {...profileForm.register('level')}>
              <option value="">{t('levels.empty')}</option>
              {levelOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`levels.${option}`)}
                </option>
              ))}
              {/* Preserve any legacy free-text level so it is not silently dropped. */}
              {isCustomLevel && <option value={levelValue}>{levelValue}</option>}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('fields.seasonGoal')}>
              <textarea
                className={`${inputClass} min-h-28`}
                placeholder={t('placeholders.seasonGoal')}
                {...profileForm.register('seasonGoal')}
              />
            </Field>
          </div>
          {serverError && (
            <p className="sm:col-span-2 rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}
          <div className="sm:col-span-2">
            <button className={primaryButtonClass} disabled={saveProfile.isPending} type="submit">
              {saveProfile.isPending ? t('saving') : t('saveProfile')}
            </button>
          </div>
        </form>
      </section>

      <section className={tab === 'equipment' ? '' : 'hidden'}>
        <div className="surface rounded-xl p-5" data-testid="profile-equipment-form">
          <h2 className="text-lg font-semibold text-text-primary">{t('equipment.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('equipment.subtitle')}</p>
          <form
            className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3"
            onSubmit={equipmentForm.handleSubmit((values) =>
              addEquipment.mutate({
                cueName: values.cueName || undefined,
                cueWeight: toNumber(values.cueWeight),
                tipBrand: values.tipBrand || undefined,
                tipSize: toNumber(values.tipSize),
                tipChangeDate: values.tipChangeDate || undefined,
                extension: values.extension || undefined,
                chalk: values.chalk || undefined,
                notes: values.notes || undefined,
                activeFrom: values.activeFrom || undefined,
              }),
            )}
          >
            <div className="col-span-2 sm:col-span-3">
              <Field label={t('equipment.fields.cueName')}>
                <input
                  className={inputClass}
                  placeholder={t('equipment.placeholders.cueName')}
                  {...equipmentForm.register('cueName')}
                />
              </Field>
            </div>
            <Field label={t('equipment.fields.cueWeight')}>
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder={t('equipment.placeholders.cueWeight')}
                {...equipmentForm.register('cueWeight')}
              />
            </Field>
            <Field label={t('equipment.fields.tipSize')}>
              <input
                className={inputClass}
                inputMode="decimal"
                placeholder={t('equipment.placeholders.tipSize')}
                {...equipmentForm.register('tipSize')}
              />
            </Field>
            <Field label={t('equipment.fields.tipBrand')}>
              <input
                className={inputClass}
                placeholder={t('equipment.placeholders.tipBrand')}
                {...equipmentForm.register('tipBrand')}
              />
            </Field>
            <Field label={t('equipment.fields.extension')}>
              <input
                className={inputClass}
                placeholder={t('equipment.placeholders.extension')}
                {...equipmentForm.register('extension')}
              />
            </Field>
            <Field label={t('equipment.fields.chalk')}>
              <input
                className={inputClass}
                placeholder={t('equipment.placeholders.chalk')}
                {...equipmentForm.register('chalk')}
              />
            </Field>
            <Field label={t('equipment.fields.tipChangeDate')}>
              <input className={inputClass} type="date" {...equipmentForm.register('tipChangeDate')} />
            </Field>
            <Field label={t('equipment.fields.activeFrom')}>
              <input className={inputClass} type="date" {...equipmentForm.register('activeFrom')} />
            </Field>
            <div className="col-span-2 sm:col-span-3">
              <Field label={t('equipment.fields.notes')}>
                <textarea
                  className={`${inputClass} min-h-16`}
                  placeholder={t('equipment.placeholders.notes')}
                  {...equipmentForm.register('notes')}
                />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <button
                className={primaryButtonClass}
                disabled={!profileQuery.data || addEquipment.isPending}
                type="submit"
              >
                {addEquipment.isPending ? t('saving') : t('equipment.add')}
              </button>
              {!profileQuery.data && (
                <p className="mt-2 text-xs text-state-warning">{t('equipment.needsProfile')}</p>
              )}
            </div>
          </form>

          <div className="mt-5 border-t border-border-subtle/60 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('tabs.currentEquipment')}</h3>
            <div className="mt-3 flex flex-col gap-3">
              {currentItems.length === 0 && (
                <p className="text-sm text-text-secondary">{t('equipment.currentEmpty')}</p>
              )}
              {currentItems.map((item) => (
                <EquipmentCard key={item.id} item={item} onDelete={() => deleteEquipment.mutate(item.id)} t={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Equipment history lives in a collapsed accordion to keep the tab tidy. */}
        <div className="mt-4">
          <AccordionSection
            subtitle={t('equipment.history')}
            title={`${t('tabs.equipmentHistory')}${historyItems.length ? ` (${historyItems.length})` : ''}`}
          >
            <div className="flex flex-col gap-3">
              {historyItems.length === 0 && (
                <p className="text-sm text-text-secondary">{t('equipment.empty')}</p>
              )}
              {historyItems.map((item) => (
                <EquipmentCard key={item.id} item={item} onDelete={() => deleteEquipment.mutate(item.id)} t={t} />
              ))}
            </div>
          </AccordionSection>
        </div>
      </section>

      <section className={tab === 'settings' ? '' : 'hidden'}>
        <div className="surface rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary">{t('settings.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('settings.subtitle')}</p>

          {/* Language */}
          <div className="mt-5">
            <p className="text-sm font-medium text-text-secondary">{t('settings.language')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {locales.map((l) => (
                <a
                  key={l}
                  aria-current={l === locale ? 'true' : undefined}
                  className={`press flex min-h-11 items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                    l === locale
                      ? 'border-brand-accent bg-brand-accent/10 text-text-primary'
                      : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
                  }`}
                  href={`/${l}${normalizedPathname}`}
                  onClick={() => {
                    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
                  }}
                >
                  <FlagIcon locale={l} />
                  <span>{tCommon(`languages.${l}`)}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Notification email (read-only) */}
          <div className="mt-6">
            <p className="text-sm font-medium text-text-secondary">{t('settings.notificationsEmail')}</p>
            <p className="sunken mt-2 rounded-lg px-3 py-2 text-sm text-text-primary">{userEmail || '—'}</p>
            <p className="mt-1.5 text-xs text-text-disabled">{t('settings.notificationsEmailHint')}</p>
          </div>

          {/* Change password */}
          <form
            className="mt-6 grid max-w-md gap-3 border-t border-border-subtle/60 pt-5"
            onSubmit={passwordForm.handleSubmit(submitPassword)}
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('settings.password.title')}</h3>
            <Field label={t('settings.password.current')}>
              <input
                autoComplete="current-password"
                className={inputClass}
                type="password"
                {...passwordForm.register('currentPassword', { required: true })}
              />
            </Field>
            <Field
              error={passwordForm.formState.errors.newPassword ? t('settings.password.tooShort') : undefined}
              label={t('settings.password.new')}
            >
              <input
                autoComplete="new-password"
                className={inputClass}
                type="password"
                {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
              />
            </Field>
            <Field label={t('settings.password.confirm')}>
              <input
                autoComplete="new-password"
                className={inputClass}
                type="password"
                {...passwordForm.register('confirmPassword', { required: true })}
              />
            </Field>
            {passwordError && (
              <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
                {passwordError}
              </p>
            )}
            {passwordSaved && (
              <p className="rounded-md border border-state-success/40 bg-state-success/10 px-3 py-2 text-sm text-state-success">
                {t('settings.password.success')}
              </p>
            )}
            <button className={primaryButtonClass} disabled={changePassword.isPending} type="submit">
              {changePassword.isPending ? t('saving') : t('settings.password.submit')}
            </button>
          </form>
        </div>
      </section>

      {isOwner && (
        <section className={tab === 'access' ? '' : 'hidden'}>
          {token && <AccessTab token={token} />}
        </section>
      )}

      <AvatarPicker
        name={fullName}
        onChange={persistAvatar}
        onClose={() => setAvatarOpen(false)}
        open={avatarOpen}
        t={t}
        value={avatarValue}
      />
    </main>
  );
}

function toProfilePayload(values: ProfileFormValues): UpsertPlayerProfileInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    dateOfBirth: values.dateOfBirth || undefined,
    country: values.country || undefined,
    dominantHand: values.dominantHand || undefined,
    level: values.level || undefined,
    seasonGoal: values.seasonGoal || undefined,
    avatar: values.avatar || undefined,
  };
}

const inputClass = 'input-field';
const primaryButtonClass = 'btn-primary press';

function EquipmentCard({
  item,
  onDelete,
  t,
}: {
  item: EquipmentProfile;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-background-raised p-3 shadow-elev-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary">{item.cueName || t('equipment.unnamed')}</h3>
          <p className="mt-1 text-xs text-text-disabled">
            {toDateInput(item.activeFrom)}{item.activeTo ? ` - ${toDateInput(item.activeTo)}` : ''}
          </p>
        </div>
        <button
          className="press rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:border-state-error hover:text-state-error"
          onClick={onDelete}
          type="button"
        >
          {t('equipment.delete')}
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
        {item.cueWeight && <Meta label={t('equipment.fields.cueWeight')} value={String(item.cueWeight)} />}
        {item.tipBrand && <Meta label={t('equipment.fields.tipBrand')} value={item.tipBrand} />}
        {item.tipSize && <Meta label={t('equipment.fields.tipSize')} value={String(item.tipSize)} />}
        {item.chalk && <Meta label={t('equipment.fields.chalk')} value={item.chalk} />}
      </dl>
      {item.notes && <p className="mt-3 text-sm text-text-secondary">{item.notes}</p>}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-disabled">{label}</dt>
      <dd className="text-text-secondary">{value}</dd>
    </div>
  );
}

function withoutLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  while (isLocale(segments[0])) {
    segments.shift();
  }
  return segments.length > 0 ? `/${segments.join('/')}` : '';
}

function FlagIcon({ locale }: { locale: Locale }) {
  const commonClass = 'inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border border-border-subtle shadow-sm';
  if (locale === 'ru') {
    return (
      <span aria-hidden="true" className={commonClass} style={{ background: 'linear-gradient(to bottom, #fff 0 33.33%, #1c57a7 33.33% 66.66%, #d52b1e 66.66% 100%)' }} />
    );
  }
  if (locale === 'uk') {
    return (
      <span aria-hidden="true" className={commonClass} style={{ background: 'linear-gradient(to bottom, #0057b7 0 50%, #ffd700 50% 100%)' }} />
    );
  }
  return (
    <span aria-hidden="true" className={`${commonClass} relative bg-[#012169]`}>
      <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[#c8102e]" />
      <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#c8102e]" />
    </span>
  );
}

function toDateInput(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

function toNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(e: unknown, t: (key: string) => string): string {
  if (e instanceof ApiError) {
    try {
      return t(e.code);
    } catch {
      return e.code;
    }
  }
  try {
    return t('generic.internal');
  } catch {
    return 'generic.internal';
  }
}
