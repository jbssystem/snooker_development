'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  CreateTrainingSessionInput,
  DrillAttemptResult,
  DrillExecution,
  DrillTemplate,
  TrainingSession,
  TrainingSessionType,
} from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { Modal } from '@/components/layout/Modal';
import { Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { localizeDrillName, localizeDrillTemplate } from '@/lib/drill-localization';
import { useHotkey } from '@/lib/use-hotkeys';
import { TableLayoutPreview } from '@/components/table-renderer';

type SessionFormValues = {
  title: string;
  sessionType: TrainingSessionType;
  goal: string;
  intensity: string;
  fatigueBefore: string;
  focusLevel: string;
  mood: string;
};

const sessionTypes: TrainingSessionType[] = ['solo', 'coached', 'match_prep', 'review', 'other'];
const attemptResults: DrillAttemptResult[] = ['success', 'partial', 'miss', 'skipped'];

const defaultValues: SessionFormValues = {
  title: '',
  sessionType: 'solo',
  goal: '',
  intensity: '',
  fatigueBefore: '',
  focusLevel: '',
  mood: '',
};

type LiveTrainingInsight = {
  actionKey: string;
  bodyKey: string;
  confidence: number;
  metricKey: string;
  metricValue: string;
  titleKey: string;
  tone: 'accent' | 'info' | 'warning';
  values?: Record<string, number | string>;
};

export function TrainingSessionClient() {
  const t = useTranslations('training');
  const tSystemDrills = useTranslations('systemDrills');
  const tErr = useTranslations('errors.api');
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const form = useForm<SessionFormValues>({ defaultValues });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [selectedDrillId, setSelectedDrillId] = useState('');
  const [finishFatigue, setFinishFatigue] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: ['training-sessions'],
    queryFn: () => api.training.listSessions(token ?? ''),
    enabled: Boolean(token),
  });

  const drillsQuery = useQuery({
    queryKey: ['drill-templates'],
    queryFn: () => api.drills.listTemplates(token ?? ''),
    enabled: Boolean(token),
  });

  const sessions = sessionsQuery.data ?? [];
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions.find((session) => !session.endedAt) ?? sessions[0],
    [activeSessionId, sessions],
  );
  const activeExecution = activeSession?.drillExecutions.find((execution) => execution.id === activeExecutionId)
    ?? activeSession?.drillExecutions.find((execution) => !execution.endedAt)
    ?? activeSession?.drillExecutions.at(-1);

  useEffect(() => {
    if (!activeSessionId && activeSession) {
      setActiveSessionId(activeSession.id);
    }
  }, [activeSession, activeSessionId]);

  // Open the new-session form when arriving via the command palette (?new=1).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      setShowNewSession(true);
    }
  }, []);

  const createSession = useMutation({
    mutationFn: (input: CreateTrainingSessionInput) => api.training.createSession(token ?? '', input),
    onSuccess: (session) => {
      setServerError(null);
      form.reset(defaultValues);
      setShowNewSession(false);
      setActiveSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const addDrill = useMutation({
    mutationFn: (input: { sessionId: string; drillTemplateId: string }) =>
      api.training.addDrill(token ?? '', input.sessionId, { drillTemplateId: input.drillTemplateId }),
    onSuccess: (execution) => {
      setServerError(null);
      setActiveExecutionId(execution.id);
      setSelectedDrillId('');
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const addAttempt = useMutation({
    mutationFn: (input: { executionId: string; result: DrillAttemptResult }) =>
      api.training.addAttempt(token ?? '', input.executionId, { result: input.result }),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const finishDrill = useMutation({
    mutationFn: (executionId: string) => api.training.finishDrill(token ?? '', executionId, {}),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const removeLastAttempt = useMutation({
    mutationFn: (executionId: string) => api.training.removeLastAttempt(token ?? '', executionId),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const finishSession = useMutation({
    mutationFn: (sessionId: string) => {
      const input = parseOptionalInt(finishFatigue);
      return api.training.finishSession(token ?? '', sessionId, input === undefined ? {} : { fatigueAfter: input });
    },
    onSuccess: () => {
      setServerError(null);
      setFinishFatigue('');
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
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

  const openNewSession = () => {
    setServerError(null);
    setShowNewSession(true);
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="surface rounded-xl p-4 sm:p-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        <button className={`${primaryButtonClass} mt-5 w-full`} onClick={openNewSession} type="button">
          + {t('newSession.open')}
        </button>
        <div className="mt-4 grid gap-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              className={`press rounded-lg border px-3 py-2 text-left transition ${
                session.id === activeSession?.id
                  ? 'border-brand-accent bg-background-elevated text-text-primary shadow-elev-1'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              onClick={() => {
                setActiveSessionId(session.id);
                setActiveExecutionId(null);
              }}
              type="button"
            >
              <span className="block truncate text-sm font-medium">{session.title}</span>
              <span className="mt-1 block text-xs text-text-disabled">
                {formatDate(session.startedAt)} · {session.endedAt ? t('status.finished') : t('status.active')}
              </span>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
              {t('empty')}
            </p>
          )}
        </div>
      </aside>

      <section className="order-first min-w-0 lg:order-none">
        {activeSession ? (
          <ActiveSessionPanel
            activeExecution={activeExecution}
            addAttempt={(result) => {
              if (activeExecution) {
                addAttempt.mutate({ executionId: activeExecution.id, result });
              }
            }}
            addAttemptPending={addAttempt.isPending}
            addDrill={() => {
              if (activeSession && selectedDrillId) {
                addDrill.mutate({ sessionId: activeSession.id, drillTemplateId: selectedDrillId });
              }
            }}
            addDrillPending={addDrill.isPending}
            drills={drillsQuery.data ?? []}
            finishDrill={(id) => finishDrill.mutate(id)}
            finishDrillPending={finishDrill.isPending}
            removeLastAttempt={(id) => removeLastAttempt.mutate(id)}
            removeLastAttemptPending={removeLastAttempt.isPending}
            finishFatigue={finishFatigue}
            finishSession={() => finishSession.mutate(activeSession.id)}
            finishSessionPending={finishSession.isPending}
            selectedDrillId={selectedDrillId}
            serverError={serverError}
            session={activeSession}
            setActiveExecutionId={setActiveExecutionId}
            setFinishFatigue={setFinishFatigue}
            setSelectedDrillId={setSelectedDrillId}
            t={t}
            tSystemDrills={tSystemDrills}
          />
        ) : (
          <div className="grid place-items-center rounded-lg border border-dashed border-border-subtle bg-background-secondary p-10 text-center">
            <div className="max-w-sm">
              <h2 className="text-xl font-semibold text-text-primary">{t('startTitle')}</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {sessionsQuery.isLoading ? t('loading') : t('startSubtitle')}
              </p>
              <button className={`${primaryButtonClass} mt-5`} onClick={openNewSession} type="button">
                + {t('newSession.open')}
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal
        closeLabel={t('actions.close')}
        onClose={() => setShowNewSession(false)}
        open={showNewSession}
        title={t('form.title')}
      >
        <NewSessionForm
          form={form}
          onSubmit={(values) => createSession.mutate(toCreateSessionInput(values))}
          pending={createSession.isPending}
          serverError={showNewSession ? serverError : null}
          t={t}
        />
      </Modal>
    </main>
  );
}

function ActiveSessionPanel({
  activeExecution,
  addAttempt,
  addAttemptPending,
  addDrill,
  addDrillPending,
  drills,
  finishDrill,
  finishDrillPending,
  removeLastAttempt,
  removeLastAttemptPending,
  finishFatigue,
  finishSession,
  finishSessionPending,
  selectedDrillId,
  serverError,
  session,
  setActiveExecutionId,
  setFinishFatigue,
  setSelectedDrillId,
  t,
  tSystemDrills,
}: {
  activeExecution: DrillExecution | undefined;
  addAttempt: (result: DrillAttemptResult) => void;
  addAttemptPending: boolean;
  addDrill: () => void;
  addDrillPending: boolean;
  drills: DrillTemplate[];
  finishDrill: (id: string) => void;
  finishDrillPending: boolean;
  removeLastAttempt: (id: string) => void;
  removeLastAttemptPending: boolean;
  finishFatigue: string;
  finishSession: () => void;
  finishSessionPending: boolean;
  selectedDrillId: string;
  serverError: string | null;
  session: TrainingSession;
  setActiveExecutionId: (id: string) => void;
  setFinishFatigue: (value: string) => void;
  setSelectedDrillId: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
  tSystemDrills: ReturnType<typeof useTranslations>;
}) {
  const open = !session.endedAt;
  const executionOpen = Boolean(activeExecution && !activeExecution.endedAt);
  const successRate =
    activeExecution && activeExecution.attempts > 0
      ? Math.round((activeExecution.successes / activeExecution.attempts) * 100)
      : 0;

  // Keyboard shortcuts for fast attempt entry during a live drill.
  const canLog = executionOpen && !addAttemptPending;
  useHotkey('1', () => addAttempt('success'), { enabled: canLog });
  useHotkey('2', () => addAttempt('partial'), { enabled: canLog });
  useHotkey('3', () => addAttempt('miss'), { enabled: canLog });
  useHotkey('0', () => addAttempt('skipped'), { enabled: canLog });
  useHotkey('u', () => {
    if (activeExecution && activeExecution.attempts > 0 && !removeLastAttemptPending) {
      removeLastAttempt(activeExecution.id);
    }
  }, { enabled: executionOpen });

  return (
    <div className="grid gap-5">
      <header className="surface rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-brand-accent">{t(`sessionTypes.${session.sessionType}`)}</p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-text-primary">{session.title}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDate(session.startedAt)} · {open ? t('status.active') : t('status.finished')}
            </p>
          </div>
          {open && (
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span>{t('fields.fatigueAfter')}</span>
                <input
                  className={`${inputClass} h-11 w-20`}
                  max={10}
                  min={1}
                  onChange={(event) => setFinishFatigue(event.target.value)}
                  placeholder="1–10"
                  type="number"
                  value={finishFatigue}
                />
              </label>
              <button className={secondaryButtonClass} disabled={finishSessionPending} onClick={finishSession} type="button">
                {t('actions.finishSession')}
              </button>
            </div>
          )}
        </div>
        {session.goal && <p className="mt-3 text-sm text-text-secondary">{session.goal}</p>}
        <SessionMeta session={session} t={t} />
      </header>

      {serverError && (
        <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
          {serverError}
        </p>
      )}

      {open && (
        <section className="surface rounded-xl p-4 sm:p-5">
          <label className="text-sm font-medium text-text-secondary">{t('drillPicker.title')}</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select className={inputClass} onChange={(event) => setSelectedDrillId(event.target.value)} value={selectedDrillId}>
              <option value="">{t('drillPicker.empty')}</option>
              {drills.map((drill) => (
                <option key={drill.id} value={drill.id}>{localizeDrillTemplate(drill, tSystemDrills).name}</option>
              ))}
            </select>
            <button className={primaryButtonClass} disabled={!selectedDrillId || addDrillPending} onClick={addDrill} type="button">
              {t('drillPicker.add')}
            </button>
          </div>
        </section>
      )}

      {activeExecution ? (
        <section className="rounded-lg border border-brand-accent/50 bg-background-secondary p-4 shadow-glow sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-brand-accent">{t('execution.current')}</p>
              <h3 className="mt-1 text-xl font-semibold text-text-primary">
                {localizeDrillName(activeExecution.drillTemplateId, activeExecution.drillTemplateName, tSystemDrills) ?? t('execution.unnamed')}
              </h3>
            </div>
            {executionOpen && (
              <button
                className={secondaryButtonClass}
                disabled={finishDrillPending}
                onClick={() => finishDrill(activeExecution.id)}
                type="button"
              >
                {t('actions.finishDrill')}
              </button>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Tally label={t('execution.attempts')} value={activeExecution.attempts} />
            <Tally label={t('execution.successes')} value={activeExecution.successes} />
            <Tally label={t('execution.successRate')} value={`${successRate}%`} />
          </dl>

          {executionOpen ? (
            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {attemptResults.map((result) => (
                  <button
                    key={result}
                    className={attemptButtonClass(result)}
                    disabled={addAttemptPending}
                    onClick={() => addAttempt(result)}
                    type="button"
                  >
                    <span>{t(`attemptResults.${result}`)}</span>
                    <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-medium opacity-70">
                      {attemptKey[result]}
                    </kbd>
                  </button>
                ))}
              </div>
              <button
                className="justify-self-start text-sm text-text-disabled underline-offset-4 transition hover:text-text-primary hover:underline disabled:opacity-50"
                disabled={removeLastAttemptPending || activeExecution.attempts === 0}
                onClick={() => removeLastAttempt(activeExecution.id)}
                type="button"
              >
                ↩ {t('actions.undoAttempt')} <kbd className="ml-1 rounded border border-border-subtle px-1 text-[10px]">U</kbd>
              </button>
            </div>
          ) : (
            <p className="sunken mt-4 rounded-lg px-3 py-2 text-sm text-text-secondary">
              {t('execution.finishedNote')}
            </p>
          )}

          <div className="mt-5">
            <AccordionSection compact title={t('attempts.title')}>
              {activeExecution.tableLayoutSnapshot && (
                <div className="mb-4">
                  <TableLayoutPreview layout={activeExecution.tableLayoutSnapshot} />
                </div>
              )}
              <div className="overflow-x-auto rounded-md border border-border-subtle">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="bg-background-primary text-text-disabled">
                    <tr>
                      <th className="px-3 py-2">{t('attempts.number')}</th>
                      <th className="px-3 py-2">{t('attempts.result')}</th>
                      <th className="px-3 py-2">{t('attempts.time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeExecution.attemptsLog].reverse().map((attempt) => (
                      <tr key={attempt.id} className="border-t border-border-subtle text-text-secondary">
                        <td className="px-3 py-2">{attempt.attemptNumber}</td>
                        <td className="px-3 py-2">{t(`attemptResults.${attempt.result}`)}</td>
                        <td className="px-3 py-2">{formatDate(attempt.createdAt)}</td>
                      </tr>
                    ))}
                    {activeExecution.attemptsLog.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-text-secondary" colSpan={3}>{t('attempts.empty')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AccordionSection>
          </div>
        </section>
      ) : (
        open && (
          <p className="surface rounded-xl p-5 text-sm text-text-secondary">
            {t('execution.empty')}
          </p>
        )
      )}

      {session.drillExecutions.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-text-disabled">{t('execution.sessionDrills')}</h3>
          <div className="flex flex-wrap gap-2">
            {session.drillExecutions.map((execution) => (
              <button
                key={execution.id}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  activeExecution?.id === execution.id
                    ? 'border-brand-accent bg-background-elevated text-text-primary'
                    : 'border-border-subtle bg-background-secondary text-text-secondary hover:border-brand-accent hover:text-text-primary'
                }`}
                onClick={() => setActiveExecutionId(execution.id)}
                type="button"
              >
                <span className="block max-w-[200px] truncate font-medium">
                  {localizeDrillName(execution.drillTemplateId, execution.drillTemplateName, tSystemDrills) ?? t('execution.unnamed')}
                </span>
                <span className="mt-0.5 block text-xs text-text-disabled">
                  {execution.successes}/{execution.attempts} · {execution.endedAt ? t('status.finished') : t('status.active')}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <LiveSessionInsight insight={buildLiveTrainingInsight(session, activeExecution)} t={t} />
    </div>
  );
}

function SessionMeta({ session, t }: { session: TrainingSession; t: ReturnType<typeof useTranslations> }) {
  const items: Array<{ label: string; value: number }> = [];
  if (session.intensity !== undefined) items.push({ label: t('fields.intensity'), value: session.intensity });
  if (session.fatigueBefore !== undefined) items.push({ label: t('fields.fatigueBefore'), value: session.fatigueBefore });
  if (session.fatigueAfter !== undefined) items.push({ label: t('fields.fatigueAfter'), value: session.fatigueAfter });
  if (session.focusLevel !== undefined) items.push({ label: t('fields.focusLevel'), value: session.focusLevel });
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className="rounded-md bg-background-elevated px-2.5 py-1 text-xs text-text-secondary shadow-elev-1">
          {item.label}: <span className="font-medium text-text-primary">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function Tally({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="sunken rounded-lg px-3 py-3">
      <dd className="text-2xl font-semibold text-text-primary">{value}</dd>
      <dt className="mt-1 text-xs text-text-disabled">{label}</dt>
    </div>
  );
}

function NewSessionForm({
  form,
  onSubmit,
  pending,
  serverError,
  t,
}: {
  form: ReturnType<typeof useForm<SessionFormValues>>;
  onSubmit: (values: SessionFormValues) => void;
  pending: boolean;
  serverError: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field error={form.formState.errors.title?.message} hint={t('hints.title')} label={t('fields.title')}>
        <input
          autoFocus
          className={inputClass}
          placeholder={t('placeholders.title')}
          {...form.register('title', { required: t('required') })}
        />
      </Field>
      <Field hint={t('hints.sessionType')} label={t('fields.sessionType')}>
        <select className={inputClass} {...form.register('sessionType')}>
          {sessionTypes.map((type) => (
            <option key={type} value={type}>{t(`sessionTypes.${type}`)}</option>
          ))}
        </select>
      </Field>
      <Field hint={t('hints.goal')} label={t('fields.goal')}>
        <textarea
          className={`${inputClass} min-h-20`}
          placeholder={t('placeholders.goal')}
          {...form.register('goal')}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field hint={t('hints.score')} label={t('fields.intensity')}>
          <input className={inputClass} max={10} min={1} type="number" {...form.register('intensity')} />
        </Field>
        <Field hint={t('hints.score')} label={t('fields.fatigueBefore')}>
          <input className={inputClass} max={10} min={1} type="number" {...form.register('fatigueBefore')} />
        </Field>
        <Field hint={t('hints.score')} label={t('fields.focusLevel')}>
          <input className={inputClass} max={10} min={1} type="number" {...form.register('focusLevel')} />
        </Field>
      </div>
      <Field hint={t('hints.mood')} label={t('fields.mood')}>
        <input className={inputClass} placeholder={t('placeholders.mood')} {...form.register('mood')} />
      </Field>
      {serverError && (
        <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
          {serverError}
        </p>
      )}
      <button className={primaryButtonClass} disabled={pending} type="submit">
        {pending ? t('saving') : t('form.submit')}
      </button>
    </form>
  );
}

function LiveSessionInsight({ insight, t }: { insight: LiveTrainingInsight; t: ReturnType<typeof useTranslations> }) {
  return (
    <section className={`rounded-lg border bg-background-secondary p-4 ${liveInsightToneClass(insight.tone)}`} data-testid="live-training-insight">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">{t('liveInsights.eyebrow')}</p>
          <h3 className="mt-1 text-base font-semibold text-text-primary">
            {t(`liveInsights.cards.${insight.titleKey}.title`, insight.values)}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-text-primary">{insight.metricValue}</p>
          <p className="text-xs text-text-disabled">{t(`liveInsights.metrics.${insight.metricKey}`)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {t(`liveInsights.cards.${insight.bodyKey}.body`, insight.values)}
      </p>
      <p className="sunken mt-3 rounded-lg px-3 py-2 text-sm text-text-primary">
        <span className="text-xs uppercase text-text-disabled">{t('liveInsights.nextAction')}: </span>
        {t(`liveInsights.cards.${insight.actionKey}.action`, insight.values)}
      </p>
    </section>
  );
}

function buildLiveTrainingInsight(session: TrainingSession, activeExecution: DrillExecution | undefined): LiveTrainingInsight {
  const readinessScore = sessionReadinessScore(session);

  if (session.fatigueBefore !== undefined && session.fatigueBefore >= 7 && session.focusLevel !== undefined && session.focusLevel <= 5) {
    return {
      actionKey: 'loadGuard',
      bodyKey: 'loadGuard',
      confidence: 78,
      metricKey: 'readiness',
      metricValue: `${readinessScore}/100`,
      titleKey: 'loadGuard',
      tone: 'warning',
      values: { fatigue: session.fatigueBefore, focus: session.focusLevel },
    };
  }

  if (!activeExecution) {
    return {
      actionKey: 'chooseDrill',
      bodyKey: 'chooseDrill',
      confidence: 40,
      metricKey: 'sample',
      metricValue: '0',
      titleKey: 'chooseDrill',
      tone: 'info',
    };
  }

  const attemptSample = activeExecution.attemptsLog.filter((attempt) => attempt.result !== 'skipped');
  const sampleSize = attemptSample.length || activeExecution.attempts;
  const successRate = activeExecution.attempts > 0 ? Math.round((activeExecution.successes / activeExecution.attempts) * 100) : 0;

  if (sampleSize < 5) {
    return {
      actionKey: 'collectSignal',
      bodyKey: 'collectSignal',
      confidence: 45,
      metricKey: 'sample',
      metricValue: String(sampleSize),
      titleKey: 'collectSignal',
      tone: 'info',
      values: { attempts: sampleSize },
    };
  }

  if (attemptSample.length >= 10) {
    const recentRate = attemptWindowRate(attemptSample.slice(-5));
    const previousRate = attemptWindowRate(attemptSample.slice(-10, -5));
    const delta = Math.round(recentRate - previousRate);

    if (delta >= 20) {
      return {
        actionKey: 'trendUp',
        bodyKey: 'trendUp',
        confidence: 76,
        metricKey: 'trend',
        metricValue: `+${delta}%`,
        titleKey: 'trendUp',
        tone: 'accent',
        values: { recentRate: Math.round(recentRate), delta },
      };
    }

    if (delta <= -20) {
      return {
        actionKey: 'trendDown',
        bodyKey: 'trendDown',
        confidence: 76,
        metricKey: 'trend',
        metricValue: `${delta}%`,
        titleKey: 'trendDown',
        tone: 'warning',
        values: { recentRate: Math.round(recentRate), delta: Math.abs(delta) },
      };
    }
  }

  if (successRate < 45) {
    return {
      actionKey: 'resetDifficulty',
      bodyKey: 'resetDifficulty',
      confidence: 72,
      metricKey: 'successRate',
      metricValue: `${successRate}%`,
      titleKey: 'resetDifficulty',
      tone: 'warning',
      values: { successRate },
    };
  }

  if (successRate >= 80 && sampleSize >= 10) {
    return {
      actionKey: 'raiseChallenge',
      bodyKey: 'raiseChallenge',
      confidence: 74,
      metricKey: 'successRate',
      metricValue: `${successRate}%`,
      titleKey: 'raiseChallenge',
      tone: 'accent',
      values: { successRate },
    };
  }

  return {
    actionKey: 'stable',
    bodyKey: 'stable',
    confidence: 68,
    metricKey: 'successRate',
    metricValue: `${successRate}%`,
    titleKey: 'stable',
    tone: 'info',
    values: { successRate },
  };
}

function sessionReadinessScore(session: TrainingSession): number {
  let score = 60;
  if (session.fatigueBefore !== undefined) score -= (session.fatigueBefore - 5) * 6;
  if (session.focusLevel !== undefined) score += (session.focusLevel - 5) * 6;
  if (session.intensity !== undefined && session.intensity >= 8) score -= 6;
  return Math.max(10, Math.min(95, Math.round(score)));
}

function attemptWindowRate(attempts: DrillExecution['attemptsLog']): number {
  if (attempts.length === 0) return 0;
  const score = attempts.reduce((sum, attempt) => {
    if (attempt.result === 'success') return sum + 1;
    if (attempt.result === 'partial') return sum + 0.5;
    return sum;
  }, 0);
  return (score / attempts.length) * 100;
}

function liveInsightToneClass(tone: LiveTrainingInsight['tone']): string {
  if (tone === 'accent') return 'border-brand-accent/70 shadow-glow';
  if (tone === 'warning') return 'border-state-warning/70';
  return 'border-border-subtle';
}

const inputClass = 'input-field';
const primaryButtonClass = 'btn-primary';
const secondaryButtonClass =
  'min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-60';

const attemptKey: Record<DrillAttemptResult, string> = {
  success: '1',
  partial: '2',
  miss: '3',
  skipped: '0',
};

function attemptButtonClass(result: DrillAttemptResult): string {
  const base =
    'press flex min-h-14 items-center justify-center gap-2 rounded-lg border bg-background-secondary px-3 py-2 text-base font-semibold shadow-elev-1 transition disabled:opacity-60';
  const byResult: Record<DrillAttemptResult, string> = {
    success: 'border-state-success/60 text-state-success hover:bg-state-success/10',
    partial: 'border-brand-accent/60 text-brand-accent hover:bg-brand-accent/10',
    miss: 'border-state-error/60 text-state-error hover:bg-state-error/10',
    skipped: 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary',
  };
  return `${base} ${byResult[result]}`;
}

function toCreateSessionInput(values: SessionFormValues): CreateTrainingSessionInput {
  const input: CreateTrainingSessionInput = {
    title: values.title.trim(),
    sessionType: values.sessionType,
  };
  assignTrimmed(input, 'goal', values.goal);
  assignTrimmed(input, 'mood', values.mood);
  assignNumber(input, 'intensity', values.intensity);
  assignNumber(input, 'fatigueBefore', values.fatigueBefore);
  assignNumber(input, 'focusLevel', values.focusLevel);

  return input;
}

function assignTrimmed<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    target[key] = trimmed as T[K];
  }
}

function assignNumber<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  const parsed = parseOptionalInt(value);
  if (parsed !== undefined) {
    target[key] = parsed as T[K];
  }
}

function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
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
