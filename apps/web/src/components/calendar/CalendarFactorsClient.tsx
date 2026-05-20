'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type {
  CalendarEvent,
  CalendarEventType,
  CreateCalendarEventInput,
  CreateLifestyleFactorInput,
  CreateSupplementEventInput,
  LifestyleFactor,
  SupplementEvent,
} from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

type CalendarEventFormValues = {
  eventType: CalendarEventType;
  title: string;
  startAt: string;
  endAt: string;
  description: string;
};

type LifestyleFormValues = {
  date: string;
  sleepHours: string;
  sleepQuality: string;
  fatigue: string;
  stress: string;
  focus: string;
  mood: string;
  illness: boolean;
  injury: boolean;
  travel: boolean;
  notes: string;
};

type SupplementFormValues = {
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  dosageNote: string;
  reason: string;
  notes: string;
};

const eventTypes: CalendarEventType[] = [
  'training',
  'tournament',
  'match',
  'travel',
  'rest_day',
  'illness',
  'injury',
  'equipment_change',
  'coach_change',
  'supplement_start',
  'supplement_end',
  'sleep_issue',
  'school_workload',
  'custom_factor',
];

export function CalendarFactorsClient() {
  const t = useTranslations('calendar');
  const tErr = useTranslations('errors.api');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const eventForm = useForm<CalendarEventFormValues>({ defaultValues: calendarEventDefaults() });
  const lifestyleForm = useForm<LifestyleFormValues>({ defaultValues: lifestyleDefaults() });
  const supplementForm = useForm<SupplementFormValues>({ defaultValues: supplementDefaults() });

  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
  });
  const eventsQuery = useQuery({
    queryKey: ['calendar-events', token],
    queryFn: () => api.calendar.listEvents(token ?? ''),
    enabled: Boolean(token),
  });
  const lifestyleQuery = useQuery({
    queryKey: ['lifestyle-factors', token],
    queryFn: () => api.calendar.listLifestyleFactors(token ?? ''),
    enabled: Boolean(token),
  });
  const supplementsQuery = useQuery({
    queryKey: ['supplement-events', token],
    queryFn: () => api.calendar.listSupplementEvents(token ?? ''),
    enabled: Boolean(token),
  });

  const createEvent = useMutation({
    mutationFn: (input: CreateCalendarEventInput) => api.calendar.createEvent(token ?? '', input),
    onSuccess: () => {
      eventForm.reset(calendarEventDefaults());
      queryClient.invalidateQueries({ queryKey: ['calendar-events', token] });
    },
  });
  const saveLifestyle = useMutation({
    mutationFn: (input: CreateLifestyleFactorInput) =>
      api.calendar.saveLifestyleFactor(token ?? '', input),
    onSuccess: () => {
      lifestyleForm.reset(lifestyleDefaults());
      queryClient.invalidateQueries({ queryKey: ['lifestyle-factors', token] });
    },
  });
  const createSupplement = useMutation({
    mutationFn: (input: CreateSupplementEventInput) =>
      api.calendar.createSupplementEvent(token ?? '', input),
    onSuccess: () => {
      supplementForm.reset(supplementDefaults());
      queryClient.invalidateQueries({ queryKey: ['supplement-events', token] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events', token] });
    },
  });

  if (!token) {
    return (
      <main className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-3 text-text-secondary">{t('authRequired')}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary hover:bg-brand-accent"
        >
          {t('loginCta')}
        </Link>
      </main>
    );
  }

  const profileMissing = profileQuery.data === null;
  const events = eventsQuery.data ?? [];
  const lifestyleFactors = lifestyleQuery.data ?? [];
  const supplements = supplementsQuery.data ?? [];
  const serverError = [createEvent.error, saveLifestyle.error, createSupplement.error]
    .filter(Boolean)
    .map((error) => errorMessage(error, tErr))[0];

  return (
    <main className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="grid gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">{t('title')}</h1>
            <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
          </div>
          <p className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary">
            {t('sensitive')}
          </p>
        </header>

        {profileMissing && (
          <section className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-5 text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">
              {t('profileRequired.title')}
            </h2>
            <p className="mt-2">{t('profileRequired.description')}</p>
            <Link
              href="/profile"
              className="mt-4 inline-flex rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary hover:bg-brand-accent"
            >
              {t('profileRequired.cta')}
            </Link>
          </section>
        )}

        <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('events.title')}</h2>
          <div className="mt-5 grid gap-3">
            {events.map((event) => (
              <CalendarEventCard key={event.id} event={event} locale={locale} />
            ))}
            {events.length === 0 && (
              <EmptyState
                loading={eventsQuery.isLoading}
                text={t('events.empty')}
                loadingText={t('loading')}
              />
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
            <h2 className="text-xl font-semibold text-text-primary">{t('lifestyle.title')}</h2>
            <div className="mt-5 grid gap-3">
              {lifestyleFactors.slice(0, 8).map((factor) => (
                <LifestyleCard key={factor.id} factor={factor} locale={locale} />
              ))}
              {lifestyleFactors.length === 0 && (
                <EmptyState
                  loading={lifestyleQuery.isLoading}
                  text={t('lifestyle.empty')}
                  loadingText={t('loading')}
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
            <h2 className="text-xl font-semibold text-text-primary">{t('supplements.title')}</h2>
            <div className="mt-5 grid gap-3">
              {supplements.slice(0, 8).map((supplement) => (
                <SupplementCard key={supplement.id} supplement={supplement} locale={locale} />
              ))}
              {supplements.length === 0 && (
                <EmptyState
                  loading={supplementsQuery.isLoading}
                  text={t('supplements.empty')}
                  loadingText={t('loading')}
                />
              )}
            </div>
          </div>
        </section>
      </section>

      <aside className="grid gap-6">
        <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('forms.eventTitle')}</h2>
          <form
            className="mt-5 grid gap-4"
            onSubmit={eventForm.handleSubmit((values) =>
              createEvent.mutate(toCalendarEventInput(values)),
            )}
          >
            <Field label={t('fields.type')}>
              <select className={inputClass} {...eventForm.register('eventType')}>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('fields.title')} error={eventForm.formState.errors.title?.message}>
              <input
                className={inputClass}
                {...eventForm.register('title', { required: t('required') })}
              />
            </Field>
            <Field label={t('fields.startAt')}>
              <input
                className={inputClass}
                type="datetime-local"
                {...eventForm.register('startAt', { required: t('required') })}
              />
            </Field>
            <Field label={t('fields.endAt')}>
              <input
                className={inputClass}
                type="datetime-local"
                {...eventForm.register('endAt')}
              />
            </Field>
            <Field label={t('fields.description')}>
              <textarea
                className={`${inputClass} min-h-20`}
                {...eventForm.register('description')}
              />
            </Field>
            <SubmitButton
              disabled={createEvent.isPending || profileMissing}
              label={t('forms.saveEvent')}
              loading={createEvent.isPending}
              loadingLabel={t('saving')}
            />
          </form>
        </section>

        <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('forms.lifestyleTitle')}</h2>
          <form
            className="mt-5 grid gap-4"
            onSubmit={lifestyleForm.handleSubmit((values) =>
              saveLifestyle.mutate(toLifestyleInput(values)),
            )}
          >
            <Field label={t('fields.date')}>
              <input
                className={inputClass}
                type="date"
                {...lifestyleForm.register('date', { required: t('required') })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.sleepHours')}>
                <input
                  className={inputClass}
                  max={24}
                  min={0}
                  step="0.5"
                  type="number"
                  {...lifestyleForm.register('sleepHours')}
                />
              </Field>
              <Field label={t('fields.sleepQuality')}>
                <input
                  className={inputClass}
                  max={10}
                  min={1}
                  type="number"
                  {...lifestyleForm.register('sleepQuality')}
                />
              </Field>
              <Field label={t('fields.fatigue')}>
                <input
                  className={inputClass}
                  max={10}
                  min={1}
                  type="number"
                  {...lifestyleForm.register('fatigue')}
                />
              </Field>
              <Field label={t('fields.stress')}>
                <input
                  className={inputClass}
                  max={10}
                  min={1}
                  type="number"
                  {...lifestyleForm.register('stress')}
                />
              </Field>
              <Field label={t('fields.focus')}>
                <input
                  className={inputClass}
                  max={10}
                  min={1}
                  type="number"
                  {...lifestyleForm.register('focus')}
                />
              </Field>
              <Field label={t('fields.mood')}>
                <input className={inputClass} {...lifestyleForm.register('mood')} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Checkbox label={t('fields.illness')} register={lifestyleForm.register('illness')} />
              <Checkbox label={t('fields.injury')} register={lifestyleForm.register('injury')} />
              <Checkbox label={t('fields.travel')} register={lifestyleForm.register('travel')} />
            </div>
            <Field label={t('fields.notes')}>
              <textarea className={`${inputClass} min-h-20`} {...lifestyleForm.register('notes')} />
            </Field>
            <SubmitButton
              disabled={saveLifestyle.isPending || profileMissing}
              label={t('forms.saveLifestyle')}
              loading={saveLifestyle.isPending}
              loadingLabel={t('saving')}
            />
          </form>
        </section>

        <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('forms.supplementTitle')}</h2>
          <form
            className="mt-5 grid gap-4"
            onSubmit={supplementForm.handleSubmit((values) =>
              createSupplement.mutate(toSupplementInput(values)),
            )}
          >
            <Field label={t('fields.name')} error={supplementForm.formState.errors.name?.message}>
              <input
                className={inputClass}
                {...supplementForm.register('name', { required: t('required') })}
              />
            </Field>
            <Field label={t('fields.category')}>
              <input className={inputClass} {...supplementForm.register('category')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.startDate')}>
                <input
                  className={inputClass}
                  type="date"
                  {...supplementForm.register('startDate', { required: t('required') })}
                />
              </Field>
              <Field label={t('fields.endDate')}>
                <input className={inputClass} type="date" {...supplementForm.register('endDate')} />
              </Field>
            </div>
            <Field label={t('fields.dosageNote')}>
              <input className={inputClass} {...supplementForm.register('dosageNote')} />
            </Field>
            <Field label={t('fields.reason')}>
              <input className={inputClass} {...supplementForm.register('reason')} />
            </Field>
            <Field label={t('fields.notes')}>
              <textarea
                className={`${inputClass} min-h-20`}
                {...supplementForm.register('notes')}
              />
            </Field>
            {serverError && (
              <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
                {serverError}
              </p>
            )}
            <SubmitButton
              disabled={createSupplement.isPending || profileMissing}
              label={t('forms.saveSupplement')}
              loading={createSupplement.isPending}
              loadingLabel={t('saving')}
            />
          </form>
        </section>
      </aside>
    </main>
  );
}

function CalendarEventCard({ event, locale }: { event: CalendarEvent; locale: string }) {
  const t = useTranslations('calendar');
  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand-gold">
            {t(`types.${event.eventType}`)}
          </p>
          <h3 className="mt-1 font-medium text-text-primary">{event.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {formatDateTime(event.startAt, locale)}
            {event.endAt ? ` - ${formatDateTime(event.endAt, locale)}` : ''}
          </p>
        </div>
        <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">
          {event.source}
        </span>
      </div>
      {event.description && <p className="mt-3 text-sm text-text-secondary">{event.description}</p>}
    </article>
  );
}

function LifestyleCard({ factor, locale }: { factor: LifestyleFactor; locale: string }) {
  const t = useTranslations('calendar');
  const flags = [
    factor.illness ? t('flags.illness') : '',
    factor.injury ? t('flags.injury') : '',
    factor.travel ? t('flags.travel') : '',
  ].filter(Boolean);
  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-text-primary">{formatDate(factor.date, locale)}</h3>
        <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">
          {factor.focus ? `${t('fields.focus')} ${factor.focus}/10` : t('noScore')}
        </span>
      </div>
      <p className="mt-3 text-sm text-text-secondary">
        {t('lifestyle.meta', {
          sleep: factor.sleepHours ?? 0,
          fatigue: factor.fatigue ?? 0,
          stress: factor.stress ?? 0,
        })}
      </p>
      {flags.length > 0 && <p className="mt-2 text-xs text-brand-gold">{flags.join(' · ')}</p>}
      {factor.notes && <p className="mt-2 text-sm text-text-secondary">{factor.notes}</p>}
    </article>
  );
}

function SupplementCard({ supplement, locale }: { supplement: SupplementEvent; locale: string }) {
  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-text-primary">{supplement.name}</h3>
        {supplement.category && (
          <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">
            {supplement.category}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        {formatDate(supplement.startDate, locale)}
        {supplement.endDate ? ` - ${formatDate(supplement.endDate, locale)}` : ''}
      </p>
      {supplement.reason && <p className="mt-2 text-sm text-text-secondary">{supplement.reason}</p>}
    </article>
  );
}

function EmptyState({
  loading,
  loadingText,
  text,
}: {
  loading: boolean;
  loadingText: string;
  text: string;
}) {
  return (
    <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
      {loading ? loadingText : text}
    </p>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string | undefined;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-sm text-text-secondary">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}

function Checkbox({ label, register }: { label: string; register: UseFormRegisterReturn }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-sm text-text-secondary">
      <input className="h-4 w-4 accent-brand-accent" type="checkbox" {...register} />
      <span>{label}</span>
    </label>
  );
}

function SubmitButton({
  disabled,
  label,
  loading,
  loadingLabel,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <button className={primaryButtonClass} disabled={disabled} type="submit">
      {loading ? loadingLabel : label}
    </button>
  );
}

function calendarEventDefaults(): CalendarEventFormValues {
  return {
    eventType: 'training',
    title: '',
    startAt: toDateTimeLocal(new Date()),
    endAt: '',
    description: '',
  };
}

function lifestyleDefaults(): LifestyleFormValues {
  return {
    date: toDateInput(new Date()),
    sleepHours: '',
    sleepQuality: '',
    fatigue: '',
    stress: '',
    focus: '',
    mood: '',
    illness: false,
    injury: false,
    travel: false,
    notes: '',
  };
}

function supplementDefaults(): SupplementFormValues {
  return {
    name: '',
    category: '',
    startDate: toDateInput(new Date()),
    endDate: '',
    dosageNote: '',
    reason: '',
    notes: '',
  };
}

function toCalendarEventInput(values: CalendarEventFormValues): CreateCalendarEventInput {
  const input: CreateCalendarEventInput = {
    eventType: values.eventType,
    title: values.title,
    startAt: new Date(values.startAt).toISOString(),
  };
  if (values.endAt) input.endAt = new Date(values.endAt).toISOString();
  assignText(input, 'description', values.description);
  return input;
}

function toLifestyleInput(values: LifestyleFormValues): CreateLifestyleFactorInput {
  const input: CreateLifestyleFactorInput = {
    date: new Date(values.date).toISOString(),
    illness: values.illness,
    injury: values.injury,
    travel: values.travel,
  };
  assignNumber(input, 'sleepHours', values.sleepHours);
  assignInt(input, 'sleepQuality', values.sleepQuality);
  assignInt(input, 'fatigue', values.fatigue);
  assignInt(input, 'stress', values.stress);
  assignInt(input, 'focus', values.focus);
  assignText(input, 'mood', values.mood);
  assignText(input, 'notes', values.notes);
  return input;
}

function toSupplementInput(values: SupplementFormValues): CreateSupplementEventInput {
  const input: CreateSupplementEventInput = {
    name: values.name,
    startDate: new Date(values.startDate).toISOString(),
  };
  if (values.endDate) input.endDate = new Date(values.endDate).toISOString();
  assignText(input, 'category', values.category);
  assignText(input, 'dosageNote', values.dosageNote);
  assignText(input, 'reason', values.reason);
  assignText(input, 'notes', values.notes);
  return input;
}

function assignText<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  const trimmed = value.trim();
  if (trimmed) target[key] = trimmed as T[K];
}

function assignInt<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  if (!value.trim()) return;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isNaN(parsed)) target[key] = parsed as T[K];
}

function assignNumber<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  if (!value.trim()) return;
  const parsed = Number.parseFloat(value);
  if (!Number.isNaN(parsed)) target[key] = parsed as T[K];
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDateTimeLocal(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function errorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    try {
      return t(error.code);
    } catch {
      return error.code;
    }
  }
  try {
    return t('generic.internal');
  } catch {
    return 'generic.internal';
  }
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass =
  'rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent disabled:opacity-60';
