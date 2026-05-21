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
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { localizeDrillName, localizeDrillTemplate } from '@/lib/drill-localization';
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

  const createSession = useMutation({
    mutationFn: (input: CreateTrainingSessionInput) => api.training.createSession(token ?? '', input),
    onSuccess: (session) => {
      setServerError(null);
      form.reset(defaultValues);
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

  return (
    <main className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <aside className="rounded-lg border border-border-subtle bg-background-secondary p-4 sm:p-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        <div className="mt-5 grid gap-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              className={`rounded-md border px-3 py-2 text-left transition ${
                session.id === activeSession?.id
                  ? 'border-brand-accent bg-background-elevated text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              onClick={() => setActiveSessionId(session.id)}
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

      <section className="min-w-0">
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
            finishFatigue={finishFatigue}
            finishSession={() => finishSession.mutate(activeSession.id)}
            finishSessionPending={finishSession.isPending}
            selectedDrillId={selectedDrillId}
            session={activeSession}
            setActiveExecutionId={setActiveExecutionId}
            setFinishFatigue={setFinishFatigue}
            setSelectedDrillId={setSelectedDrillId}
            t={t}
            tSystemDrills={tSystemDrills}
          />
        ) : (
          <div className="rounded-lg border border-border-subtle bg-background-secondary p-8 text-text-secondary">
            {sessionsQuery.isLoading ? t('loading') : t('empty')}
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-border-subtle bg-background-secondary p-4 sm:p-5">
        <h2 className="text-xl font-semibold text-text-primary">{t('form.title')}</h2>
        <form
          className="mt-5 grid gap-4"
          onSubmit={form.handleSubmit((values) => createSession.mutate(toCreateSessionInput(values)))}
        >
          <Field label={t('fields.title')} error={form.formState.errors.title?.message}>
            <input className={inputClass} {...form.register('title', { required: t('required') })} />
          </Field>
          <Field label={t('fields.sessionType')}>
            <select className={inputClass} {...form.register('sessionType')}>
              {sessionTypes.map((type) => (
                <option key={type} value={type}>{t(`sessionTypes.${type}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('fields.goal')}>
            <textarea className={`${inputClass} min-h-20`} {...form.register('goal')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('fields.intensity')}>
              <input className={inputClass} max={10} min={1} type="number" {...form.register('intensity')} />
            </Field>
            <Field label={t('fields.fatigueBefore')}>
              <input className={inputClass} max={10} min={1} type="number" {...form.register('fatigueBefore')} />
            </Field>
            <Field label={t('fields.focusLevel')}>
              <input className={inputClass} max={10} min={1} type="number" {...form.register('focusLevel')} />
            </Field>
          </div>
          <Field label={t('fields.mood')}>
            <input className={inputClass} {...form.register('mood')} />
          </Field>
          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}
          <button className={primaryButtonClass} disabled={createSession.isPending} type="submit">
            {createSession.isPending ? t('saving') : t('form.submit')}
          </button>
        </form>
      </aside>
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
  finishFatigue,
  finishSession,
  finishSessionPending,
  selectedDrillId,
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
  finishFatigue: string;
  finishSession: () => void;
  finishSessionPending: boolean;
  selectedDrillId: string;
  session: TrainingSession;
  setActiveExecutionId: (id: string) => void;
  setFinishFatigue: (value: string) => void;
  setSelectedDrillId: (id: string) => void;
  t: (key: string) => string;
  tSystemDrills: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="grid gap-5">
      <header className="rounded-lg border border-border-subtle bg-background-secondary p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-brand-accent">{t(`sessionTypes.${session.sessionType}`)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-text-primary">{session.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {formatDate(session.startedAt)} · {session.endedAt ? t('status.finished') : t('status.active')}
            </p>
          </div>
          {!session.endedAt && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t('fields.fatigueAfter')}>
                <input
                  className={`${inputClass} w-24`}
                  max={10}
                  min={1}
                  onChange={(event) => setFinishFatigue(event.target.value)}
                  type="number"
                  value={finishFatigue}
                />
              </Field>
              <button className={secondaryButtonClass} disabled={finishSessionPending} onClick={finishSession} type="button">
                {t('actions.finishSession')}
              </button>
            </div>
          )}
        </div>
        {session.goal && <p className="mt-4 text-text-secondary">{session.goal}</p>}
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
          <Metric label={t('fields.intensity')} value={session.intensity} />
          <Metric label={t('fields.fatigueBefore')} value={session.fatigueBefore} />
          <Metric label={t('fields.fatigueAfter')} value={session.fatigueAfter} />
          <Metric label={t('fields.focusLevel')} value={session.focusLevel} />
        </dl>
      </header>

      {!session.endedAt && (
        <section className="rounded-lg border border-border-subtle bg-background-secondary p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-text-primary">{t('drillPicker.title')}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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

      <section className="grid gap-4">
        {session.drillExecutions.map((execution) => (
          <button
            key={execution.id}
            className={`rounded-lg border p-4 text-left transition ${
              activeExecution?.id === execution.id
                ? 'border-brand-accent bg-background-secondary'
                : 'border-border-subtle bg-background-secondary hover:border-brand-accent'
            }`}
            onClick={() => setActiveExecutionId(execution.id)}
            type="button"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {localizeDrillName(execution.drillTemplateId, execution.drillTemplateName, tSystemDrills) ?? t('execution.unnamed')}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {execution.attempts} / {execution.successes} · {execution.endedAt ? t('status.finished') : t('status.active')}
                </p>
              </div>
              {!execution.endedAt && (
                <span className="rounded-md border border-border-subtle px-3 py-1 text-sm text-text-secondary">
                  {t('execution.open')}
                </span>
              )}
            </div>
          </button>
        ))}
        {session.drillExecutions.length === 0 && (
          <p className="rounded-lg border border-border-subtle bg-background-secondary p-5 text-text-secondary">
            {t('execution.empty')}
          </p>
        )}
      </section>

      {activeExecution && (
        <section className="rounded-lg border border-border-subtle bg-background-secondary p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-text-primary">
                {localizeDrillName(activeExecution.drillTemplateId, activeExecution.drillTemplateName, tSystemDrills) ?? t('execution.unnamed')}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {activeExecution.attempts} {t('execution.attempts')} · {activeExecution.successes} {t('execution.successes')}
              </p>
            </div>
            {!activeExecution.endedAt && (
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

          {!activeExecution.endedAt && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {attemptResults.map((result) => (
                <button
                  key={result}
                  className={secondaryButtonClass}
                  disabled={addAttemptPending}
                  onClick={() => addAttempt(result)}
                  type="button"
                >
                  {t(`attemptResults.${result}`)}
                </button>
              ))}
            </div>
          )}

          {activeExecution.tableLayoutSnapshot && (
            <div className="mt-5">
              <h4 className="mb-3 text-sm font-medium text-text-secondary">{t('tableLayout.title')}</h4>
              <TableLayoutPreview layout={activeExecution.tableLayoutSnapshot} />
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-md border border-border-subtle">
            <table className="min-w-[420px] w-full text-left text-sm">
              <thead className="bg-background-primary text-text-disabled">
                <tr>
                  <th className="px-3 py-2">{t('attempts.number')}</th>
                  <th className="px-3 py-2">{t('attempts.result')}</th>
                  <th className="px-3 py-2">{t('attempts.time')}</th>
                </tr>
              </thead>
              <tbody>
                {activeExecution.attemptsLog.map((attempt) => (
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
        </section>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass =
  'min-h-11 rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent disabled:opacity-60';
const secondaryButtonClass =
  'min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-60';

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <dt className="text-text-disabled">{label}</dt>
      <dd className="text-text-primary">{value ?? '—'}</dd>
    </div>
  );
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
