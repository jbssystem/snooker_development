'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
import { Field, PageHeader } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/lib/toast-store';

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

type CalendarMonthDay = {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  key: string;
  lifestyleFactors: LifestyleFactor[];
  supplements: SupplementEvent[];
};

type CalendarItemKind = 'day' | 'event' | 'lifestyle' | 'supplement';

type CalendarSelection = {
  id: string;
  kind: CalendarItemKind;
};

type CalendarViewMode = 'calendar' | 'list';

type SelectedCalendarDetail = {
  badge: string | undefined;
  dateText: string;
  description: string | undefined;
  items?: CalendarMonthItem[];
  rows: Array<{ label: string; value: string }>;
  title: string;
  typeLabel: string;
};

type CalendarMonthItem = CalendarSelection & {
  description: string | undefined;
  label: string;
  meta: string;
  tone: Exclude<CalendarItemKind, 'day'>;
};

type QuickEntryForm = 'event' | 'lifestyle' | 'supplement';

type ReadinessLens = {
  actionKey: string;
  bodyKey: string;
  confidence: number;
  metricKey: string;
  metricValue: string;
  titleKey: string;
  tone: 'accent' | 'info' | 'warning';
  values?: Record<string, number | string>;
};

const listPageSize = 8;

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
  const tToast = useTranslations('toasts');
  const toast = useToast();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const eventForm = useForm<CalendarEventFormValues>({ defaultValues: calendarEventDefaults() });
  const lifestyleForm = useForm<LifestyleFormValues>({ defaultValues: lifestyleDefaults() });
  const supplementForm = useForm<SupplementFormValues>({ defaultValues: supplementDefaults() });
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedItem, setSelectedItem] = useState<CalendarSelection | null>(null);
  const [activeForm, setActiveForm] = useState<QuickEntryForm>('event');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('calendar');

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
      toast.success(tToast('eventCreated'));
    },
    onError: (e) => toast.error(errorMessage(e, tErr)),
  });
  const saveLifestyle = useMutation({
    mutationFn: (input: CreateLifestyleFactorInput) =>
      api.calendar.saveLifestyleFactor(token ?? '', input),
    onSuccess: () => {
      lifestyleForm.reset(lifestyleDefaults());
      queryClient.invalidateQueries({ queryKey: ['lifestyle-factors', token] });
      toast.success(tToast('factorSaved'));
    },
    onError: (e) => toast.error(errorMessage(e, tErr)),
  });
  const createSupplement = useMutation({
    mutationFn: (input: CreateSupplementEventInput) =>
      api.calendar.createSupplementEvent(token ?? '', input),
    onSuccess: () => {
      supplementForm.reset(supplementDefaults());
      queryClient.invalidateQueries({ queryKey: ['supplement-events', token] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events', token] });
      toast.success(tToast('supplementCreated'));
    },
    onError: (e) => toast.error(errorMessage(e, tErr)),
  });

  const events = eventsQuery.data ?? [];
  const lifestyleFactors = lifestyleQuery.data ?? [];
  const supplements = supplementsQuery.data ?? [];
  const readinessLens = useMemo(() => buildReadinessLens(lifestyleFactors), [lifestyleFactors]);
  const monthDays = useMemo(
    () => buildCalendarMonth(calendarMonth, events, lifestyleFactors, supplements),
    [calendarMonth, events, lifestyleFactors, supplements],
  );
  const selectedDetail = useMemo(
    () => resolveCalendarSelection(selectedItem, events, lifestyleFactors, supplements, locale, t),
    [events, lifestyleFactors, locale, selectedItem, supplements, t],
  );

  const profileMissing = profileQuery.data === null;
  const serverError = [createEvent.error, saveLifestyle.error, createSupplement.error]
    .filter(Boolean)
    .map((error) => errorMessage(error, tErr))[0];

  return (
    <main className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-6">
        <PageHeader
          actions={
            <span className="rounded-full border border-border-subtle bg-background-secondary px-3 py-1.5 text-sm text-text-secondary">
              {t('sensitive')}
            </span>
          }
          subtitle={t('subtitle')}
          title={t('title')}
        />

        <ReadinessLensPanel lens={readinessLens} t={t} />

        {profileMissing && (
          <section className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-5 text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">
              {t('profileRequired.title')}
            </h2>
            <p className="mt-2">{t('profileRequired.description')}</p>
            <Link href="/profile" className="btn-primary mt-4">
              {t('profileRequired.cta')}
            </Link>
          </section>
        )}

        <section className="surface rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-text-primary">{t('events.title')}</h2>
            <ViewModeSwitch mode={viewMode} setMode={setViewMode} t={t} />
          </div>

          <div className="mt-5">
            <div className="min-w-0 ui-fade-in" key={viewMode}>
              {viewMode === 'calendar' ? (
                <CalendarMonthView
                  days={monthDays}
                  locale={locale}
                  month={calendarMonth}
                  nextMonth={() => setCalendarMonth((value) => addMonths(value, 1))}
                  onSelect={setSelectedItem}
                  previousMonth={() => setCalendarMonth((value) => addMonths(value, -1))}
                  selectedItem={selectedItem}
                  t={t}
                  today={() => setCalendarMonth(startOfMonth(new Date()))}
                />
              ) : (
                <CalendarListView
                  events={events}
                  eventsLoading={eventsQuery.isLoading}
                  lifestyleFactors={lifestyleFactors}
                  lifestyleLoading={lifestyleQuery.isLoading}
                  locale={locale}
                  onSelect={setSelectedItem}
                  selectedItem={selectedItem}
                  supplements={supplements}
                  supplementsLoading={supplementsQuery.isLoading}
                  t={t}
                />
              )}
            </div>
          </div>
        </section>
      </section>

      <CalendarDetailModal
        detail={selectedDetail}
        onClose={() => setSelectedItem(null)}
        onSelect={setSelectedItem}
        t={t}
      />

      <aside className="grid content-start gap-3 self-start xl:sticky xl:top-24">
        <section className="overflow-hidden surface rounded-xl/90">
          <div className="border-b border-border-subtle px-4 py-4">
            <h2 className="text-lg font-semibold text-text-primary">{t('forms.quickTitle')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('forms.quickSubtitle')}</p>
          </div>
          <QuickEntryTabs activeForm={activeForm} setActiveForm={setActiveForm} t={t} />
          <div className="px-4 pb-4 pt-2 ui-fade-in" key={activeForm}>
            {activeForm === 'event' && (
              <form
                className="grid gap-4"
                data-testid="calendar-event-form"
                onSubmit={eventForm.handleSubmit((values) =>
                  createEvent.mutate(toCalendarEventInput(values)),
                )}
              >
                <Field hint={t('hints.type')} label={t('fields.type')}>
                  <select className={inputClass} {...eventForm.register('eventType')}>
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  error={eventForm.formState.errors.title?.message}
                  hint={t('hints.title')}
                  label={t('fields.title')}
                >
                  <input
                    className={inputClass}
                    placeholder={t('placeholders.title')}
                    {...eventForm.register('title', { required: t('required') })}
                  />
                </Field>
                <Field hint={t('hints.startAt')} label={t('fields.startAt')}>
                  <input
                    className={inputClass}
                    type="datetime-local"
                    {...eventForm.register('startAt', { required: t('required') })}
                  />
                </Field>
                <Field hint={t('hints.endAt')} label={t('fields.endAt')}>
                  <input
                    className={inputClass}
                    type="datetime-local"
                    {...eventForm.register('endAt')}
                  />
                </Field>
                <Field hint={t('hints.description')} label={t('fields.description')}>
                  <textarea
                    className={`${inputClass} min-h-20`}
                    placeholder={t('placeholders.description')}
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
            )}

            {activeForm === 'lifestyle' && (
              <form
                className="grid gap-4"
                data-testid="calendar-lifestyle-form"
                onSubmit={lifestyleForm.handleSubmit((values) =>
                  saveLifestyle.mutate(toLifestyleInput(values)),
                )}
              >
                <Field hint={t('hints.date')} label={t('fields.date')}>
                  <input
                    className={inputClass}
                    type="date"
                    {...lifestyleForm.register('date', { required: t('required') })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field hint={t('hints.sleepHours')} label={t('fields.sleepHours')}>
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      max={24}
                      min={0}
                      placeholder={t('placeholders.sleepHours')}
                      step="0.5"
                      type="number"
                      {...lifestyleForm.register('sleepHours')}
                    />
                  </Field>
                  <Field hint={t('hints.score')} label={t('fields.sleepQuality')}>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      max={10}
                      min={1}
                      placeholder={t('placeholders.score')}
                      type="number"
                      {...lifestyleForm.register('sleepQuality')}
                    />
                  </Field>
                  <Field hint={t('hints.score')} label={t('fields.fatigue')}>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      max={10}
                      min={1}
                      placeholder={t('placeholders.score')}
                      type="number"
                      {...lifestyleForm.register('fatigue')}
                    />
                  </Field>
                  <Field hint={t('hints.score')} label={t('fields.stress')}>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      max={10}
                      min={1}
                      placeholder={t('placeholders.score')}
                      type="number"
                      {...lifestyleForm.register('stress')}
                    />
                  </Field>
                  <Field hint={t('hints.score')} label={t('fields.focus')}>
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      max={10}
                      min={1}
                      placeholder={t('placeholders.score')}
                      type="number"
                      {...lifestyleForm.register('focus')}
                    />
                  </Field>
                  <Field hint={t('hints.mood')} label={t('fields.mood')}>
                    <input
                      className={inputClass}
                      placeholder={t('placeholders.mood')}
                      {...lifestyleForm.register('mood')}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Checkbox label={t('fields.illness')} register={lifestyleForm.register('illness')} />
                  <Checkbox label={t('fields.injury')} register={lifestyleForm.register('injury')} />
                  <Checkbox label={t('fields.travel')} register={lifestyleForm.register('travel')} />
                </div>
                <Field hint={t('hints.notes')} label={t('fields.notes')}>
                  <textarea
                    className={`${inputClass} min-h-20`}
                    placeholder={t('placeholders.notes')}
                    {...lifestyleForm.register('notes')}
                  />
                </Field>
                <SubmitButton
                  disabled={saveLifestyle.isPending || profileMissing}
                  label={t('forms.saveLifestyle')}
                  loading={saveLifestyle.isPending}
                  loadingLabel={t('saving')}
                />
              </form>
            )}

            {activeForm === 'supplement' && (
              <form
                className="grid gap-4"
                data-testid="calendar-supplement-form"
                onSubmit={supplementForm.handleSubmit((values) =>
                  createSupplement.mutate(toSupplementInput(values)),
                )}
              >
                <Field
                  error={supplementForm.formState.errors.name?.message}
                  hint={t('hints.name')}
                  label={t('fields.name')}
                >
                  <input
                    className={inputClass}
                    placeholder={t('placeholders.name')}
                    {...supplementForm.register('name', { required: t('required') })}
                  />
                </Field>
                <Field hint={t('hints.category')} label={t('fields.category')}>
                  <input
                    className={inputClass}
                    placeholder={t('placeholders.category')}
                    {...supplementForm.register('category')}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field hint={t('hints.startDate')} label={t('fields.startDate')}>
                    <input
                      className={inputClass}
                      type="date"
                      {...supplementForm.register('startDate', { required: t('required') })}
                    />
                  </Field>
                  <Field hint={t('hints.endDate')} label={t('fields.endDate')}>
                    <input className={inputClass} type="date" {...supplementForm.register('endDate')} />
                  </Field>
                </div>
                <Field hint={t('hints.dosageNote')} label={t('fields.dosageNote')}>
                  <input
                    className={inputClass}
                    placeholder={t('placeholders.dosageNote')}
                    {...supplementForm.register('dosageNote')}
                  />
                </Field>
                <Field hint={t('hints.reason')} label={t('fields.reason')}>
                  <input
                    className={inputClass}
                    placeholder={t('placeholders.reason')}
                    {...supplementForm.register('reason')}
                  />
                </Field>
                <Field hint={t('hints.notes')} label={t('fields.notes')}>
                  <textarea
                    className={`${inputClass} min-h-20`}
                    placeholder={t('placeholders.notes')}
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
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}

function ReadinessLensPanel({ lens, t }: { lens: ReadinessLens; t: ReturnType<typeof useTranslations> }) {
  return (
    <section className={`rounded-lg border bg-background-secondary p-4 sm:p-5 ${readinessToneClass(lens.tone)}`} data-testid="readiness-lens">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">{t('insights.eyebrow')}</p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary">
            {t(`insights.cards.${lens.titleKey}.title`, lens.values)}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-text-primary">{lens.metricValue}</p>
          <p className="text-xs text-text-disabled">{t(`insights.metrics.${lens.metricKey}`)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <p className="text-sm leading-6 text-text-secondary">
          {t(`insights.cards.${lens.bodyKey}.body`, lens.values)}
        </p>
        <div className="sunken rounded-md px-3 py-2 text-sm text-text-secondary">
          <p className="text-xs uppercase text-text-disabled">{t('insights.nextAction')}</p>
          <p className="mt-1 text-text-primary">{t(`insights.cards.${lens.actionKey}.action`, lens.values)}</p>
          <p className="mt-2 text-xs text-text-disabled">{t('insights.confidence', { confidence: lens.confidence })}</p>
        </div>
      </div>
    </section>
  );
}

function buildReadinessLens(lifestyleFactors: LifestyleFactor[]): ReadinessLens {
  const recentFactors = [...lifestyleFactors]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 7);

  if (recentFactors.length === 0) {
    return {
      actionKey: 'noData',
      bodyKey: 'noData',
      confidence: 30,
      metricKey: 'days',
      metricValue: '0/7',
      titleKey: 'noData',
      tone: 'info',
    };
  }

  const sleepAverage = averageDefined(recentFactors.map((factor) => factor.sleepHours));
  const fatigueAverage = averageDefined(recentFactors.map((factor) => factor.fatigue));
  const stressAverage = averageDefined(recentFactors.map((factor) => factor.stress));
  const focusAverage = averageDefined(recentFactors.map((factor) => factor.focus));
  const score = readinessScore(sleepAverage, fatigueAverage, stressAverage, focusAverage);
  const filledSignals = [sleepAverage, fatigueAverage, stressAverage, focusAverage].filter((value) => value !== undefined).length;
  const confidence = Math.min(90, Math.round(35 + recentFactors.length * 7 + filledSignals * 3));
  const values = {
    days: recentFactors.length,
    fatigue: formatAverage(fatigueAverage),
    focus: formatAverage(focusAverage),
    sleep: formatAverage(sleepAverage),
    stress: formatAverage(stressAverage),
  };

  if (sleepAverage !== undefined && sleepAverage < 6.5) {
    return {
      actionKey: 'lowSleep',
      bodyKey: 'lowSleep',
      confidence,
      metricKey: 'score',
      metricValue: `${score}/100`,
      titleKey: 'lowSleep',
      tone: 'warning',
      values,
    };
  }

  if ((stressAverage !== undefined && stressAverage >= 7) || (fatigueAverage !== undefined && fatigueAverage >= 7)) {
    return {
      actionKey: 'strain',
      bodyKey: 'strain',
      confidence,
      metricKey: 'score',
      metricValue: `${score}/100`,
      titleKey: 'strain',
      tone: 'warning',
      values,
    };
  }

  if (focusAverage !== undefined && focusAverage >= 7 && (fatigueAverage === undefined || fatigueAverage <= 5)) {
    return {
      actionKey: 'ready',
      bodyKey: 'ready',
      confidence,
      metricKey: 'score',
      metricValue: `${score}/100`,
      titleKey: 'ready',
      tone: 'accent',
      values,
    };
  }

  return {
    actionKey: 'neutral',
    bodyKey: 'neutral',
    confidence,
    metricKey: 'score',
    metricValue: `${score}/100`,
    titleKey: 'neutral',
    tone: 'info',
    values,
  };
}

function readinessScore(
  sleepAverage: number | undefined,
  fatigueAverage: number | undefined,
  stressAverage: number | undefined,
  focusAverage: number | undefined,
): number {
  let score = 55;
  if (sleepAverage !== undefined) score += (sleepAverage - 7) * 7;
  if (focusAverage !== undefined) score += (focusAverage - 5) * 5;
  if (fatigueAverage !== undefined) score -= (fatigueAverage - 5) * 5;
  if (stressAverage !== undefined) score -= (stressAverage - 5) * 4;
  return Math.max(10, Math.min(95, Math.round(score)));
}

function averageDefined(values: Array<number | undefined>): number | undefined {
  const definedValues = values.filter((value): value is number => value !== undefined);
  if (definedValues.length === 0) return undefined;
  return definedValues.reduce((sum, value) => sum + value, 0) / definedValues.length;
}

function formatAverage(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function readinessToneClass(tone: ReadinessLens['tone']): string {
  if (tone === 'accent') return 'border-brand-accent/70 shadow-glow';
  if (tone === 'warning') return 'border-state-warning/70';
  return 'border-border-subtle';
}

function CalendarMonthView({
  days,
  locale,
  month,
  nextMonth,
  onSelect,
  previousMonth,
  selectedItem,
  t,
  today,
}: {
  days: CalendarMonthDay[];
  locale: string;
  month: Date;
  nextMonth: () => void;
  onSelect: (item: CalendarSelection) => void;
  previousMonth: () => void;
  selectedItem: CalendarSelection | null;
  t: ReturnType<typeof useTranslations>;
  today: () => void;
}) {
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-primary">{formatMonth(month, locale)}</h3>
        <div className="flex items-center gap-2">
          <button
            aria-label={t('month.previous')}
            className={monthButtonClass}
            onClick={previousMonth}
            type="button"
          >
            &lt;
          </button>
          <button className={monthButtonClass} onClick={today} type="button">
            {t('month.today')}
          </button>
          <button aria-label={t('month.next')} className={monthButtonClass} onClick={nextMonth} type="button">
            &gt;
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border-subtle">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-border-subtle sunken">
            {weekdays.map((weekday) => (
              <div key={weekday} className="px-3 py-2 text-xs font-medium uppercase text-text-disabled">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <CalendarMonthCell
                key={day.key}
                day={day}
                locale={locale}
                onSelect={onSelect}
                selectedItem={selectedItem}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarMonthCell({
  day,
  locale,
  onSelect,
  selectedItem,
  t,
}: {
  day: CalendarMonthDay;
  locale: string;
  onSelect: (item: CalendarSelection) => void;
  selectedItem: CalendarSelection | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const allItems = calendarItemsForDay(day, t);
  const visibleItems = allItems.slice(0, 3);
  const hiddenCount = allItems.length - visibleItems.length;
  const daySelected = isSelected(selectedItem, { id: day.key, kind: 'day' });
  const dateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(day.date);
  const dayTitle = formatDate(day.date.toISOString(), locale);

  return (
    <div
      className={`relative min-h-[132px] overflow-hidden border-b border-r border-border-subtle p-2 transition-colors duration-150 ${
        day.isCurrentMonth ? 'bg-background-secondary' : 'bg-background-primary/60'
      } ${daySelected ? 'ring-1 ring-inset ring-border-active' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        {allItems.length > 0 ? (
          <button
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-sm font-medium transition hover:bg-background-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
              isToday(day.date) ? 'bg-brand-primary text-text-primary' : 'text-text-secondary'
            } ${day.isCurrentMonth ? '' : 'opacity-50'}`}
            onClick={() => onSelect({ id: day.key, kind: 'day' })}
            title={dayTitle}
            type="button"
          >
            {dateLabel}
          </button>
        ) : (
          <span
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-sm font-medium ${
              isToday(day.date) ? 'bg-brand-primary text-text-primary' : 'text-text-secondary'
            } ${day.isCurrentMonth ? '' : 'opacity-50'}`}
          >
            {dateLabel}
          </span>
        )}
      </div>
      <div className="mt-2 grid gap-1">
        {visibleItems.map((item) => (
          <button
            key={`${item.tone}-${item.id}`}
            className={`min-h-[38px] rounded-md border px-2 py-1 text-left text-xs transition duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
              monthItemClass(item.tone)
            } ${isSelected(selectedItem, item) ? 'ring-1 ring-brand-accent' : ''}`}
            onClick={() => onSelect({ id: item.id, kind: item.kind })}
            title={`${item.meta}: ${item.label}`}
            type="button"
          >
            <span className="block truncate font-medium">{item.label}</span>
            <span className="block truncate text-[11px] opacity-80">{item.meta}</span>
          </button>
        ))}
        {hiddenCount > 0 && (
          <button
            className="rounded-md bg-background-elevated px-2 py-1 text-left text-xs text-text-secondary transition hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
            onClick={() => onSelect({ id: day.key, kind: 'day' })}
            type="button"
          >
            {t('month.more', { count: hiddenCount })}
          </button>
        )}
      </div>
    </div>
  );
}

function QuickEntryTabs({
  activeForm,
  setActiveForm,
  t,
}: {
  activeForm: QuickEntryForm;
  setActiveForm: (form: QuickEntryForm) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const forms: QuickEntryForm[] = ['event', 'lifestyle', 'supplement'];

  return (
    <div className="grid grid-cols-3 gap-1 border-b border-border-subtle sunken p-2" role="tablist">
      {forms.map((form) => (
        <button
          key={form}
          aria-selected={activeForm === form}
          className={`min-h-10 rounded-md px-2 text-sm font-medium transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
            activeForm === form
              ? 'bg-brand-primary text-text-primary shadow-glow'
              : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
          }`}
          onClick={() => setActiveForm(form)}
          role="tab"
          type="button"
        >
          {t(`forms.tabs.${form}`)}
        </button>
      ))}
    </div>
  );
}

function ViewModeSwitch({
  mode,
  setMode,
  t,
}: {
  mode: CalendarViewMode;
  setMode: (mode: CalendarViewMode) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const options: CalendarViewMode[] = ['calendar', 'list'];

  return (
    <div className="inline-flex rounded-md border border-border-subtle sunken p-1">
      {options.map((option) => (
        <button
          key={option}
          aria-pressed={mode === option}
          className={`min-h-9 rounded px-3 text-sm font-medium transition ${
            mode === option
              ? 'bg-brand-primary text-text-primary shadow-glow'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setMode(option)}
          type="button"
        >
          {t(`view.${option}`)}
        </button>
      ))}
    </div>
  );
}

function CalendarListView({
  events,
  eventsLoading,
  lifestyleFactors,
  lifestyleLoading,
  locale,
  onSelect,
  selectedItem,
  supplements,
  supplementsLoading,
  t,
}: {
  events: CalendarEvent[];
  eventsLoading: boolean;
  lifestyleFactors: LifestyleFactor[];
  lifestyleLoading: boolean;
  locale: string;
  onSelect: (item: CalendarSelection) => void;
  selectedItem: CalendarSelection | null;
  supplements: SupplementEvent[];
  supplementsLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [visibleEvents, setVisibleEvents] = useState(listPageSize);
  const [visibleLifestyle, setVisibleLifestyle] = useState(listPageSize);
  const [visibleSupplements, setVisibleSupplements] = useState(listPageSize);
  const eventItems = events.slice(0, visibleEvents);
  const lifestyleItems = lifestyleFactors.slice(0, visibleLifestyle);
  const supplementItems = supplements.slice(0, visibleSupplements);

  return (
    <div className="grid gap-5">
      <section>
        <h3 className="text-lg font-semibold text-text-primary">{t('events.listTitle')}</h3>
        <div className="mt-3 grid gap-3">
          {eventItems.map((event, i) => (
            <div key={event.id} className="ui-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
              <CalendarEventCard
                event={event}
                locale={locale}
                onSelect={() => onSelect({ id: event.id, kind: 'event' })}
                selected={isSelected(selectedItem, { id: event.id, kind: 'event' })}
              />
            </div>
          ))}
          {events.length === 0 && (
            <EmptyState loading={eventsLoading} loadingText={t('loading')} text={t('events.empty')} />
          )}
          <ShowMoreButton
            hiddenCount={events.length - eventItems.length}
            onClick={() => setVisibleEvents((value) => value + listPageSize)}
            t={t}
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{t('lifestyle.title')}</h3>
          <div className="mt-3 grid gap-3">
            {lifestyleItems.map((factor) => (
              <LifestyleCard
                key={factor.id}
                factor={factor}
                locale={locale}
                onSelect={() => onSelect({ id: factor.id, kind: 'lifestyle' })}
                selected={isSelected(selectedItem, { id: factor.id, kind: 'lifestyle' })}
              />
            ))}
            {lifestyleFactors.length === 0 && (
              <EmptyState loading={lifestyleLoading} loadingText={t('loading')} text={t('lifestyle.empty')} />
            )}
            <ShowMoreButton
              hiddenCount={lifestyleFactors.length - lifestyleItems.length}
              onClick={() => setVisibleLifestyle((value) => value + listPageSize)}
              t={t}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-text-primary">{t('supplements.title')}</h3>
          <div className="mt-3 grid gap-3">
            {supplementItems.map((supplement) => (
              <SupplementCard
                key={supplement.id}
                supplement={supplement}
                locale={locale}
                onSelect={() => onSelect({ id: supplement.id, kind: 'supplement' })}
                selected={isSelected(selectedItem, { id: supplement.id, kind: 'supplement' })}
              />
            ))}
            {supplements.length === 0 && (
              <EmptyState loading={supplementsLoading} loadingText={t('loading')} text={t('supplements.empty')} />
            )}
            <ShowMoreButton
              hiddenCount={supplements.length - supplementItems.length}
              onClick={() => setVisibleSupplements((value) => value + listPageSize)}
              t={t}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function CalendarDetailModal({
  detail,
  onClose,
  onSelect,
  t,
}: {
  detail: SelectedCalendarDetail | null;
  onClose: () => void;
  onSelect: (item: CalendarSelection) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  useEffect(() => {
    if (!detail) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <section
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-xl border border-border-active/60 glass p-5 shadow-elev-3 ui-fade-in sm:max-w-2xl sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label={t('details.close')}
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-background-secondary text-lg text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3 pr-12">
          <div>
            <p className="text-xs uppercase text-brand-gold">{detail.typeLabel}</p>
            <h3 className="mt-1 text-lg font-semibold text-text-primary">{detail.title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{detail.dateText}</p>
          </div>
          {detail.badge && (
            <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">
              {detail.badge}
            </span>
          )}
        </div>
        {detail.description && <p className="mt-4 text-sm text-text-secondary">{detail.description}</p>}
        {detail.items && detail.items.length > 0 && (
          <div className="mt-4 grid gap-2">
            {detail.items.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                className={`rounded-md border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${monthItemClass(
                  item.tone,
                )}`}
                onClick={() => onSelect({ id: item.id, kind: item.kind })}
                type="button"
              >
                <span className="block font-medium">{item.label}</span>
                <span className="mt-1 block text-xs opacity-80">{item.meta}</span>
              </button>
            ))}
          </div>
        )}
        {detail.rows.length > 0 && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {detail.rows.map((row) => (
              <div key={row.label} className="sunken rounded-md border border-border-subtle p-3">
                <dt className="text-xs text-text-disabled">{row.label}</dt>
                <dd className="mt-1 text-text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

function ShowMoreButton({
  hiddenCount,
  onClick,
  t,
}: {
  hiddenCount: number;
  onClick: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (hiddenCount <= 0) return null;

  return (
    <button
      className="press rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
      onClick={onClick}
      type="button"
    >
      {t('list.showMore', { count: Math.min(hiddenCount, listPageSize) })}
    </button>
  );
}

function CalendarEventCard({
  event,
  locale,
  onSelect,
  selected = false,
}: {
  event: CalendarEvent;
  locale: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const t = useTranslations('calendar');
  const content = (
    <>
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
    </>
  );

  if (onSelect) {
    return (
      <button
        className={`press rounded-md border bg-background-primary p-4 text-left transition hover:border-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
          selected ? 'border-brand-accent shadow-elev-2' : 'border-border-subtle shadow-elev-1'
        }`}
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      {content}
    </article>
  );
}

function LifestyleCard({
  factor,
  locale,
  onSelect,
  selected = false,
}: {
  factor: LifestyleFactor;
  locale: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const t = useTranslations('calendar');
  const flags = [
    factor.illness ? t('flags.illness') : '',
    factor.injury ? t('flags.injury') : '',
    factor.travel ? t('flags.travel') : '',
  ].filter(Boolean);
  const content = (
    <>
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
    </>
  );

  if (onSelect) {
    return (
      <button
        className={`press rounded-md border bg-background-primary p-4 text-left transition hover:border-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
          selected ? 'border-brand-accent shadow-elev-2' : 'border-border-subtle shadow-elev-1'
        }`}
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      {content}
    </article>
  );
}

function SupplementCard({
  supplement,
  locale,
  onSelect,
  selected = false,
}: {
  supplement: SupplementEvent;
  locale: string;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const content = (
    <>
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
    </>
  );

  if (onSelect) {
    return (
      <button
        className={`press rounded-md border bg-background-primary p-4 text-left transition hover:border-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active ${
          selected ? 'border-brand-accent shadow-elev-2' : 'border-border-subtle shadow-elev-1'
        }`}
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-md border border-border-subtle bg-background-primary p-4">
      {content}
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
    <p className="sunken rounded-md border border-border-subtle p-4 text-sm text-text-secondary">
      {loading ? loadingText : text}
    </p>
  );
}

function Checkbox({ label, register }: { label: string; register: UseFormRegisterReturn }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-border-subtle sunken px-3 py-2 text-sm text-text-secondary">
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
    <button className={`${primaryButtonClass} press`} disabled={disabled} type="submit">
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

function resolveCalendarSelection(
  selection: CalendarSelection | null,
  events: CalendarEvent[],
  lifestyleFactors: LifestyleFactor[],
  supplements: SupplementEvent[],
  locale: string,
  t: ReturnType<typeof useTranslations>,
): SelectedCalendarDetail | null {
  if (!selection) return null;

  if (selection.kind === 'day') {
    const date = dateFromDayKey(selection.id);
    const day: CalendarMonthDay = {
      date,
      events: events.filter((event) => isSameCalendarDay(new Date(event.startAt), date)),
      isCurrentMonth: true,
      key: selection.id,
      lifestyleFactors: lifestyleFactors.filter((factor) =>
        isSameCalendarDay(new Date(factor.date), date),
      ),
      supplements: supplements.filter((supplement) => isSupplementActiveOn(supplement, date)),
    };
    const items = calendarItemsForDay(day, t);

    return {
      badge: String(items.length),
      dateText: formatDate(date.toISOString(), locale),
      description: undefined,
      items,
      rows: [
        { label: t('events.listTitle'), value: String(day.events.length) },
        { label: t('lifestyle.title'), value: String(day.lifestyleFactors.length) },
        { label: t('supplements.title'), value: String(day.supplements.length) },
      ],
      title: formatDate(date.toISOString(), locale),
      typeLabel: t('details.day'),
    };
  }

  if (selection.kind === 'event') {
    const event = events.find((item) => item.id === selection.id);
    if (!event) return null;
    return {
      badge: event.source || undefined,
      dateText: formatDateTime(event.startAt, locale),
      description: event.description || undefined,
      rows: [
        { label: t('fields.startAt'), value: formatDateTime(event.startAt, locale) },
        ...(event.endAt ? [{ label: t('fields.endAt'), value: formatDateTime(event.endAt, locale) }] : []),
      ],
      title: event.title,
      typeLabel: t(`types.${event.eventType}`),
    };
  }

  if (selection.kind === 'lifestyle') {
    const factor = lifestyleFactors.find((item) => item.id === selection.id);
    if (!factor) return null;
    return {
      badge: undefined,
      dateText: formatDate(factor.date, locale),
      description: factor.notes || undefined,
      rows: [
        { label: t('fields.sleepHours'), value: factor.sleepHours == null ? '-' : String(factor.sleepHours) },
        { label: t('fields.fatigue'), value: factor.fatigue == null ? '-' : `${factor.fatigue}/10` },
        { label: t('fields.stress'), value: factor.stress == null ? '-' : `${factor.stress}/10` },
        { label: t('fields.focus'), value: factor.focus == null ? '-' : `${factor.focus}/10` },
        { label: t('fields.mood'), value: factor.mood || '-' },
      ],
      title: formatDate(factor.date, locale),
      typeLabel: t('lifestyle.title'),
    };
  }

  const supplement = supplements.find((item) => item.id === selection.id);
  if (!supplement) return null;
  return {
    badge: supplement.category || undefined,
    dateText: `${formatDate(supplement.startDate, locale)}${
      supplement.endDate ? ` - ${formatDate(supplement.endDate, locale)}` : ''
    }`,
    description: supplement.reason || supplement.notes || undefined,
    rows: [
      { label: t('fields.category'), value: supplement.category || '-' },
      { label: t('fields.dosageNote'), value: supplement.dosageNote || '-' },
    ],
    title: supplement.name,
    typeLabel: t('supplements.title'),
  };
}

function calendarItemsForDay(
  day: CalendarMonthDay,
  t: ReturnType<typeof useTranslations>,
): CalendarMonthItem[] {
  const eventItems: CalendarMonthItem[] = day.events.map((event) => ({
    description: event.description || undefined,
    id: event.id,
    kind: 'event' as const,
    label: event.title || t(`types.${event.eventType}`),
    meta: t(`types.${event.eventType}`),
    tone: 'event' as const,
  }));
  const lifestyleItems: CalendarMonthItem[] = day.lifestyleFactors.map((factor) => ({
    description: factor.notes || undefined,
    id: factor.id,
    kind: 'lifestyle' as const,
    label: lifestyleLabel(factor, t),
    meta: t('lifestyle.title'),
    tone: 'lifestyle' as const,
  }));
  const supplementItems: CalendarMonthItem[] = day.supplements.map((supplement) => ({
    description: supplement.reason || supplement.notes || undefined,
    id: supplement.id,
    kind: 'supplement' as const,
    label: supplement.name,
    meta: supplement.category || t('supplements.title'),
    tone: 'supplement' as const,
  }));

  return [...eventItems, ...lifestyleItems, ...supplementItems];
}

function dateFromDayKey(value: string): Date {
  const parts = value.split('-').map((part) => Number.parseInt(part, 10));
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
}

function isSelected(selection: CalendarSelection | null, item: CalendarSelection): boolean {
  return selection?.id === item.id && selection.kind === item.kind;
}

function buildCalendarMonth(
  month: Date,
  events: CalendarEvent[],
  lifestyleFactors: LifestyleFactor[],
  supplements: SupplementEvent[],
): CalendarMonthDay[] {
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      events: events.filter((event) => isSameCalendarDay(new Date(event.startAt), date)),
      isCurrentMonth:
        date.getFullYear() === firstDay.getFullYear() && date.getMonth() === firstDay.getMonth(),
      key: dayKey(date),
      lifestyleFactors: lifestyleFactors.filter((factor) =>
        isSameCalendarDay(new Date(factor.date), date),
      ),
      supplements: supplements.filter((supplement) => isSupplementActiveOn(supplement, date)),
    };
  });
}

function weekdayLabels(locale: string): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(addDays(monday, index)),
  );
}

function lifestyleLabel(factor: LifestyleFactor, t: ReturnType<typeof useTranslations>): string {
  const parts = [
    factor.sleepHours != null ? `${t('fields.sleepHours')} ${factor.sleepHours}` : '',
    factor.focus != null ? `${t('fields.focus')} ${factor.focus}/10` : '',
    factor.illness ? t('flags.illness') : '',
    factor.injury ? t('flags.injury') : '',
    factor.travel ? t('flags.travel') : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : t('noScore');
}

function monthItemClass(tone: 'event' | 'lifestyle' | 'supplement'): string {
  if (tone === 'event') return 'border-brand-accent/40 bg-brand-primary/20 text-text-primary';
  if (tone === 'lifestyle') return 'border-state-info/40 bg-state-info/10 text-text-secondary';
  return 'border-brand-gold/40 bg-brand-gold/10 text-text-secondary';
}

function isSupplementActiveOn(supplement: SupplementEvent, date: Date): boolean {
  const day = startOfDay(date).getTime();
  const start = startOfDay(new Date(supplement.startDate)).getTime();
  const end = supplement.endDate ? startOfDay(new Date(supplement.endDate)).getTime() : start;
  return day >= start && day <= end;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return dayKey(left) === dayKey(right);
}

function isToday(value: Date): boolean {
  return isSameCalendarDay(value, new Date());
}

function dayKey(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

function formatMonth(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(value);
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

const inputClass = 'input-field';
const primaryButtonClass = 'btn-primary';
const monthButtonClass =
  'press inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-border-subtle px-3 text-sm font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active';
