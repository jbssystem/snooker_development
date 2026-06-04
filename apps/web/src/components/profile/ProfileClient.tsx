'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CreateEquipmentProfileInput, EquipmentProfile, UpsertPlayerProfileInput } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { CountryOptions, Field, PageHeader } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { AvatarPicker } from './AvatarPicker';
import { PlayerAvatar } from './PlayerAvatar';

type ProfileTab = 'player' | 'current' | 'history';

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

  const profileForm = useForm<ProfileFormValues>({ defaultValues: profileDefaults });
  const equipmentForm = useForm<EquipmentFormValues>({ defaultValues: equipmentDefaults });

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

  const equipmentItems = useMemo(() => equipmentQuery.data ?? [], [equipmentQuery.data]);
  // "Current" = still in use (no end date); "history" = retired items.
  const currentItems = useMemo(() => equipmentItems.filter((item) => !item.activeTo), [equipmentItems]);
  const historyItems = useMemo(() => equipmentItems.filter((item) => Boolean(item.activeTo)), [equipmentItems]);
  const avatarValue = profileForm.watch('avatar');
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

  if (!token) {
    return (
      <main className="max-w-2xl">
        <PageHeader subtitle={t('authRequired')} title={t('title')} />
        <Link href="/login" className="btn-primary">
          {t('loginCta')}
        </Link>
      </main>
    );
  }

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: 'player', label: t('tabs.player') },
    { id: 'current', label: t('tabs.currentEquipment'), count: currentItems.length },
    { id: 'history', label: t('tabs.equipmentHistory'), count: historyItems.length },
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
            hint={t('hints.firstName')}
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
            hint={t('hints.lastName')}
            label={t('fields.lastName')}
          >
            <input
              className={inputClass}
              placeholder={t('placeholders.lastName')}
              {...profileForm.register('lastName', { required: t('required') })}
            />
          </Field>
          <Field hint={t('hints.dateOfBirth')} label={t('fields.dateOfBirth')}>
            <input className={inputClass} type="date" {...profileForm.register('dateOfBirth')} />
          </Field>
          <Field hint={t('hints.country')} label={t('fields.country')}>
            <select className={inputClass} {...profileForm.register('country')}>
              <CountryOptions placeholder={t('placeholders.country')} />
            </select>
          </Field>
          <Field hint={t('hints.dominantHand')} label={t('fields.dominantHand')}>
            <select className={inputClass} {...profileForm.register('dominantHand')}>
              <option value="">{t('dominantHand.empty')}</option>
              <option value="RIGHT">{t('dominantHand.RIGHT')}</option>
              <option value="LEFT">{t('dominantHand.LEFT')}</option>
              <option value="AMBIDEXTROUS">{t('dominantHand.AMBIDEXTROUS')}</option>
            </select>
          </Field>
          <Field hint={t('hints.level')} label={t('fields.level')}>
            <input
              className={inputClass}
              placeholder={t('placeholders.level')}
              {...profileForm.register('level')}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field hint={t('hints.seasonGoal')} label={t('fields.seasonGoal')}>
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

      <section className={tab === 'current' ? '' : 'hidden'}>
        <div className="surface rounded-xl p-5" data-testid="profile-equipment-form">
          <h2 className="text-lg font-semibold text-text-primary">{t('equipment.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('equipment.subtitle')}</p>
          <form
            className="mt-4 grid gap-3"
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
            <Field hint={t('equipment.hints.cueName')} label={t('equipment.fields.cueName')}>
              <input
                className={inputClass}
                placeholder={t('equipment.placeholders.cueName')}
                {...equipmentForm.register('cueName')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field hint={t('equipment.hints.cueWeight')} label={t('equipment.fields.cueWeight')}>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  placeholder={t('equipment.placeholders.cueWeight')}
                  {...equipmentForm.register('cueWeight')}
                />
              </Field>
              <Field hint={t('equipment.hints.tipSize')} label={t('equipment.fields.tipSize')}>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  placeholder={t('equipment.placeholders.tipSize')}
                  {...equipmentForm.register('tipSize')}
                />
              </Field>
            </div>
            <Field hint={t('equipment.hints.tipBrand')} label={t('equipment.fields.tipBrand')}>
              <input
                className={inputClass}
                placeholder={t('equipment.placeholders.tipBrand')}
                {...equipmentForm.register('tipBrand')}
              />
            </Field>
            <Field hint={t('equipment.hints.tipChangeDate')} label={t('equipment.fields.tipChangeDate')}>
              <input className={inputClass} type="date" {...equipmentForm.register('tipChangeDate')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field hint={t('equipment.hints.extension')} label={t('equipment.fields.extension')}>
                <input
                  className={inputClass}
                  placeholder={t('equipment.placeholders.extension')}
                  {...equipmentForm.register('extension')}
                />
              </Field>
              <Field hint={t('equipment.hints.chalk')} label={t('equipment.fields.chalk')}>
                <input
                  className={inputClass}
                  placeholder={t('equipment.placeholders.chalk')}
                  {...equipmentForm.register('chalk')}
                />
              </Field>
            </div>
            <Field hint={t('equipment.hints.activeFrom')} label={t('equipment.fields.activeFrom')}>
              <input className={inputClass} type="date" {...equipmentForm.register('activeFrom')} />
            </Field>
            <Field hint={t('equipment.hints.notes')} label={t('equipment.fields.notes')}>
              <textarea
                className={`${inputClass} min-h-20`}
                placeholder={t('equipment.placeholders.notes')}
                {...equipmentForm.register('notes')}
              />
            </Field>
            <button
              className={primaryButtonClass}
              disabled={!profileQuery.data || addEquipment.isPending}
              type="submit"
            >
              {addEquipment.isPending ? t('saving') : t('equipment.add')}
            </button>
            {!profileQuery.data && (
              <p className="text-xs text-state-warning">{t('equipment.needsProfile')}</p>
            )}
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
      </section>

      <section className={tab === 'history' ? '' : 'hidden'}>
        <div className="surface rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary">{t('equipment.history')}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {historyItems.length === 0 && (
              <p className="text-sm text-text-secondary">{t('equipment.empty')}</p>
            )}
            {historyItems.map((item) => (
              <EquipmentCard key={item.id} item={item} onDelete={() => deleteEquipment.mutate(item.id)} t={t} />
            ))}
          </div>
        </div>
      </section>

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
