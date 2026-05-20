'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type {
  AddMatchFrameInput,
  CreateMatchInput,
  FrameWinner,
  Match,
} from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

type MatchFormValues = {
  matchDate: string;
  opponentName: string;
  tournament: string;
  round: string;
  format: string;
  country: string;
  city: string;
  club: string;
  framesWon: string;
  framesLost: string;
  highBreak: string;
  breaks50: string;
  breaks70: string;
  breaks100: string;
  safetySuccess: string;
  longPotSuccess: string;
  unforcedErrors: string;
  tacticalErrors: string;
  sourceUrl: string;
  videoUrl: string;
  notes: string;
};

type FrameFormValues = {
  frameNumber: string;
  playerScore: string;
  opponentScore: string;
  winner: FrameWinner;
  highBreak: string;
  frameDurationMinutes: string;
  notes: string;
};

const frameWinners: FrameWinner[] = ['player', 'opponent', 'unknown'];

const matchDefaultValues: MatchFormValues = {
  matchDate: '',
  opponentName: '',
  tournament: '',
  round: '',
  format: '',
  country: '',
  city: '',
  club: '',
  framesWon: '',
  framesLost: '',
  highBreak: '',
  breaks50: '',
  breaks70: '',
  breaks100: '',
  safetySuccess: '',
  longPotSuccess: '',
  unforcedErrors: '',
  tacticalErrors: '',
  sourceUrl: '',
  videoUrl: '',
  notes: '',
};

const frameDefaultValues: FrameFormValues = {
  frameNumber: '',
  playerScore: '',
  opponentScore: '',
  winner: 'unknown',
  highBreak: '',
  frameDurationMinutes: '',
  notes: '',
};

export function MatchLogClient() {
  const t = useTranslations('matches');
  const tErr = useTranslations('errors.api');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const matchForm = useForm<MatchFormValues>({ defaultValues: matchDefaultValues });
  const frameForm = useForm<FrameFormValues>({ defaultValues: frameDefaultValues });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
  });

  const matchesQuery = useQuery({
    queryKey: ['matches', token],
    queryFn: () => api.matches.list(token ?? ''),
    enabled: Boolean(token),
  });

  const matches = matchesQuery.data ?? [];
  const activeMatch = useMemo(
    () => matches.find((match) => match.id === activeMatchId) ?? matches[0],
    [activeMatchId, matches],
  );
  const opponentHistory = useMemo(
    () => (activeMatch ? summarizeOpponent(matches, activeMatch.opponentName) : null),
    [activeMatch, matches],
  );

  useEffect(() => {
    if (!activeMatchId && activeMatch) {
      setActiveMatchId(activeMatch.id);
    }
  }, [activeMatch, activeMatchId]);

  const createMatch = useMutation({
    mutationFn: (input: CreateMatchInput) => api.matches.create(token ?? '', input),
    onSuccess: (match) => {
      setServerError(null);
      setActiveMatchId(match.id);
      matchForm.reset(matchDefaultValues);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
  });

  const addFrame = useMutation({
    mutationFn: (input: { matchId: string; frame: AddMatchFrameInput }) =>
      api.matches.addFrame(token ?? '', input.matchId, input.frame),
    onSuccess: () => {
      setServerError(null);
      frameForm.reset(frameDefaultValues);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
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

  return (
    <main className="grid gap-8 xl:grid-cols-[310px_minmax(0,1fr)_380px]">
      <aside className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        <div className="mt-5 grid gap-2">
          {matches.map((match) => (
            <button
              key={match.id}
              className={`rounded-md border px-3 py-2 text-left transition ${
                match.id === activeMatch?.id
                  ? 'border-brand-accent bg-background-elevated text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              onClick={() => setActiveMatchId(match.id)}
              type="button"
            >
              <span className="block truncate text-sm font-medium">{match.opponentName}</span>
              <span className="mt-1 block text-xs text-text-disabled">
                {formatDate(match.matchDate, locale)} · {match.framesWon}:{match.framesLost}
              </span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
              {matchesQuery.isLoading ? t('loading') : t('empty')}
            </p>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        {profileMissing && (
          <div className="mb-5 rounded-lg border border-state-warning/40 bg-state-warning/10 p-5 text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">{t('profileRequired.title')}</h2>
            <p className="mt-2">{t('profileRequired.description')}</p>
            <Link href="/profile" className="mt-4 inline-flex rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary hover:bg-brand-accent">
              {t('profileRequired.cta')}
            </Link>
          </div>
        )}

        {activeMatch ? (
          <MatchDetail
            addFrame={(values) => addFrame.mutate({ matchId: activeMatch.id, frame: toAddFrameInput(values) })}
            addFramePending={addFrame.isPending}
            frameForm={frameForm}
            locale={locale}
            match={activeMatch}
            opponentHistory={opponentHistory}
            t={t}
          />
        ) : (
          <div className="rounded-lg border border-border-subtle bg-background-secondary p-8 text-text-secondary">
            {matchesQuery.isLoading ? t('loading') : t('empty')}
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <h2 className="text-xl font-semibold text-text-primary">{t('form.title')}</h2>
        <form
          className="mt-5 grid gap-4"
          onSubmit={matchForm.handleSubmit((values) => createMatch.mutate(toCreateMatchInput(values)))}
        >
          <Field label={t('fields.opponentName')} error={matchForm.formState.errors.opponentName?.message}>
            <input className={inputClass} {...matchForm.register('opponentName', { required: t('required') })} />
          </Field>
          <Field label={t('fields.matchDate')}>
            <input className={inputClass} type="datetime-local" {...matchForm.register('matchDate')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fields.framesWon')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('framesWon')} />
            </Field>
            <Field label={t('fields.framesLost')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('framesLost')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fields.tournament')}>
              <input className={inputClass} {...matchForm.register('tournament')} />
            </Field>
            <Field label={t('fields.round')}>
              <input className={inputClass} {...matchForm.register('round')} />
            </Field>
          </div>
          <Field label={t('fields.format')}>
            <input className={inputClass} {...matchForm.register('format')} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('fields.highBreak')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('highBreak')} />
            </Field>
            <Field label={t('fields.breaks50')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('breaks50')} />
            </Field>
            <Field label={t('fields.breaks70')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('breaks70')} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t('fields.breaks100')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('breaks100')} />
            </Field>
            <Field label={t('fields.safetySuccess')}>
              <input className={inputClass} max={100} min={0} type="number" {...matchForm.register('safetySuccess')} />
            </Field>
            <Field label={t('fields.longPotSuccess')}>
              <input className={inputClass} max={100} min={0} type="number" {...matchForm.register('longPotSuccess')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fields.country')}>
              <input className={inputClass} {...matchForm.register('country')} />
            </Field>
            <Field label={t('fields.city')}>
              <input className={inputClass} {...matchForm.register('city')} />
            </Field>
          </div>
          <Field label={t('fields.club')}>
            <input className={inputClass} {...matchForm.register('club')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fields.unforcedErrors')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('unforcedErrors')} />
            </Field>
            <Field label={t('fields.tacticalErrors')}>
              <input className={inputClass} min={0} type="number" {...matchForm.register('tacticalErrors')} />
            </Field>
          </div>
          <Field label={t('fields.videoUrl')}>
            <input className={inputClass} {...matchForm.register('videoUrl')} />
          </Field>
          <Field label={t('fields.sourceUrl')}>
            <input className={inputClass} {...matchForm.register('sourceUrl')} />
          </Field>
          <Field label={t('fields.notes')}>
            <textarea className={`${inputClass} min-h-20`} {...matchForm.register('notes')} />
          </Field>
          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}
          <button className={primaryButtonClass} disabled={createMatch.isPending || profileMissing} type="submit">
            {createMatch.isPending ? t('saving') : t('form.submit')}
          </button>
        </form>
      </aside>
    </main>
  );
}

function MatchDetail({
  addFrame,
  addFramePending,
  frameForm,
  locale,
  match,
  opponentHistory,
  t,
}: {
  addFrame: (values: FrameFormValues) => void;
  addFramePending: boolean;
  frameForm: ReturnType<typeof useForm<FrameFormValues>>;
  locale: string;
  match: Match;
  opponentHistory: OpponentSummary | null;
  t: (key: string, values?: Record<string, number>) => string;
}) {
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">{match.opponentName}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDate(match.matchDate, locale)}{match.tournament ? ` · ${match.tournament}` : ''}
            </p>
          </div>
          <div className="rounded-md bg-background-elevated px-3 py-2 text-lg font-semibold text-text-primary">
            {match.framesWon}:{match.framesLost}
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t('stats.result')} value={t(`result.${match.result}`)} />
          <Stat label={t('fields.highBreak')} value={formatOptional(match.highBreak)} />
          <Stat label={t('fields.breaks50')} value={String(match.breaks50)} />
          <Stat label={t('fields.breaks100')} value={String(match.breaks100)} />
          <Stat label={t('fields.longPotSuccess')} value={formatPercent(match.longPotSuccess)} />
          <Stat label={t('fields.safetySuccess')} value={formatPercent(match.safetySuccess)} />
          <Stat label={t('fields.unforcedErrors')} value={formatOptional(match.unforcedErrors)} />
          <Stat label={t('fields.tacticalErrors')} value={formatOptional(match.tacticalErrors)} />
        </dl>
        {match.notes && <p className="mt-5 rounded-md bg-background-primary p-3 text-sm text-text-secondary">{match.notes}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('frames.title')}</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background-primary text-text-disabled">
                <tr>
                  <th className="px-3 py-2 text-left">{t('frames.number')}</th>
                  <th className="px-3 py-2 text-left">{t('frames.score')}</th>
                  <th className="px-3 py-2 text-left">{t('frames.winner')}</th>
                  <th className="px-3 py-2 text-left">{t('fields.highBreak')}</th>
                </tr>
              </thead>
              <tbody>
                {match.frames.map((frame) => (
                  <tr key={frame.id} className="border-t border-border-subtle text-text-secondary">
                    <td className="px-3 py-2 text-text-primary">{frame.frameNumber}</td>
                    <td className="px-3 py-2">{formatFrameScore(frame.playerScore, frame.opponentScore)}</td>
                    <td className="px-3 py-2">{t(`winner.${frame.winner}`)}</td>
                    <td className="px-3 py-2">{formatOptional(frame.highBreak)}</td>
                  </tr>
                ))}
                {match.frames.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-text-secondary" colSpan={4}>{t('frames.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('opponent.title')}</h2>
          {opponentHistory && (
            <dl className="mt-4 grid gap-3 text-sm">
              <Stat label={t('opponent.matches')} value={String(opponentHistory.matches)} />
              <Stat label={t('opponent.record')} value={`${opponentHistory.wins}-${opponentHistory.losses}-${opponentHistory.draws}`} />
              <Stat label={t('opponent.frames')} value={`${opponentHistory.framesWon}:${opponentHistory.framesLost}`} />
            </dl>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <h2 className="text-xl font-semibold text-text-primary">{t('frames.add')}</h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-6" onSubmit={frameForm.handleSubmit(addFrame)}>
          <Field label={t('frames.number')}>
            <input className={inputClass} min={1} type="number" {...frameForm.register('frameNumber')} />
          </Field>
          <Field label={t('frames.playerScore')}>
            <input className={inputClass} min={0} type="number" {...frameForm.register('playerScore')} />
          </Field>
          <Field label={t('frames.opponentScore')}>
            <input className={inputClass} min={0} type="number" {...frameForm.register('opponentScore')} />
          </Field>
          <Field label={t('frames.winner')}>
            <select className={inputClass} {...frameForm.register('winner')}>
              {frameWinners.map((winner) => (
                <option key={winner} value={winner}>{t(`winner.${winner}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('fields.highBreak')}>
            <input className={inputClass} min={0} type="number" {...frameForm.register('highBreak')} />
          </Field>
          <Field label={t('frames.duration')}>
            <input className={inputClass} min={1} type="number" {...frameForm.register('frameDurationMinutes')} />
          </Field>
          <div className="lg:col-span-5">
            <Field label={t('fields.notes')}>
              <input className={inputClass} {...frameForm.register('notes')} />
            </Field>
          </div>
          <button className={`${primaryButtonClass} self-end`} disabled={addFramePending} type="submit">
            {addFramePending ? t('saving') : t('frames.submit')}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ children, error, label }: { children: ReactNode; error?: string | undefined; label: string }) {
  return (
    <label className="grid gap-1 text-sm text-text-secondary">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-background-primary p-3">
      <dt className="text-xs text-text-disabled">{label}</dt>
      <dd className="mt-1 font-medium text-text-primary">{value}</dd>
    </div>
  );
}

type OpponentSummary = {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  framesWon: number;
  framesLost: number;
};

function summarizeOpponent(matches: Match[], opponentName: string): OpponentSummary {
  const opponentKey = opponentName.trim().toLocaleLowerCase();
  const relevantMatches = matches.filter((match) => match.opponentName.trim().toLocaleLowerCase() === opponentKey);

  return {
    matches: relevantMatches.length,
    wins: relevantMatches.filter((match) => match.result === 'player_win').length,
    losses: relevantMatches.filter((match) => match.result === 'opponent_win').length,
    draws: relevantMatches.filter((match) => match.result === 'draw').length,
    framesWon: relevantMatches.reduce((total, match) => total + match.framesWon, 0),
    framesLost: relevantMatches.reduce((total, match) => total + match.framesLost, 0),
  };
}

function toCreateMatchInput(values: MatchFormValues): CreateMatchInput {
  const input: CreateMatchInput = { opponentName: values.opponentName };
  if (values.matchDate) input.matchDate = new Date(values.matchDate).toISOString();
  assignText(input, 'tournament', values.tournament);
  assignText(input, 'round', values.round);
  assignText(input, 'format', values.format);
  assignText(input, 'country', values.country);
  assignText(input, 'city', values.city);
  assignText(input, 'club', values.club);
  assignInt(input, 'framesWon', values.framesWon);
  assignInt(input, 'framesLost', values.framesLost);
  assignInt(input, 'highBreak', values.highBreak);
  assignInt(input, 'breaks50', values.breaks50);
  assignInt(input, 'breaks70', values.breaks70);
  assignInt(input, 'breaks100', values.breaks100);
  assignNumber(input, 'safetySuccess', values.safetySuccess);
  assignNumber(input, 'longPotSuccess', values.longPotSuccess);
  assignInt(input, 'unforcedErrors', values.unforcedErrors);
  assignInt(input, 'tacticalErrors', values.tacticalErrors);
  assignText(input, 'sourceUrl', values.sourceUrl);
  assignText(input, 'videoUrl', values.videoUrl);
  assignText(input, 'notes', values.notes);
  return input;
}

function toAddFrameInput(values: FrameFormValues): AddMatchFrameInput {
  const input: AddMatchFrameInput = { winner: values.winner };
  const durationMinutes = parseOptionalInt(values.frameDurationMinutes);
  assignInt(input, 'frameNumber', values.frameNumber);
  assignInt(input, 'playerScore', values.playerScore);
  assignInt(input, 'opponentScore', values.opponentScore);
  assignInt(input, 'highBreak', values.highBreak);
  if (durationMinutes !== undefined) input.frameDurationSec = durationMinutes * 60;
  assignText(input, 'notes', values.notes);
  return input;
}

function assignText<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  const trimmed = value.trim();
  if (trimmed) target[key] = trimmed as T[K];
}

function assignInt<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  const parsed = parseOptionalInt(value);
  if (parsed !== undefined) target[key] = parsed as T[K];
}

function assignNumber<T extends object, K extends keyof T>(target: T, key: K, value: string): void {
  if (!value.trim()) return;
  const parsed = Number.parseFloat(value);
  if (!Number.isNaN(parsed)) target[key] = parsed as T[K];
}

function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatOptional(value: number | undefined): string {
  return value === undefined ? '—' : String(value);
}

function formatPercent(value: number | undefined): string {
  return value === undefined ? '—' : `${value}%`;
}

function formatFrameScore(playerScore: number | undefined, opponentScore: number | undefined): string {
  if (playerScore === undefined && opponentScore === undefined) return '—';
  return `${playerScore ?? 0}:${opponentScore ?? 0}`;
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
