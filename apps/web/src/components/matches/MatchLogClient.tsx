'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type {
  AddMatchFrameInput,
  CreateMatchInput,
  FrameWinner,
  Match,
  MatchType,
  UpdateMatchFrameInput,
} from '@snooker/shared';
import { replay, breakRunsFor, type ScoreEvent as DomainScoreEvent } from '@snooker/snooker-domain';
import type { ScoreEvent } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { Modal } from '@/components/layout/Modal';
import { CountryOptions, Field, PageHeader, PlusIcon } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { FrameScorer, type ScorerResult } from './FrameScorer';
import { BallMap, MatchTypeBadge } from './ball-visuals';

type MatchFormValues = {
  matchType: MatchType;
  isLive: boolean;
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
  playerScore: string;
  opponentScore: string;
  highBreak: string;
  frameDurationMinutes: string;
  notes: string;
};

const matchDefaultValues: MatchFormValues = {
  matchType: 'match',
  isLive: false,
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

const MATCH_PAGE_SIZE = 8;

const frameDefaultValues: FrameFormValues = {
  playerScore: '',
  opponentScore: '',
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
  const [showCreate, setShowCreate] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editingFrameNumber, setEditingFrameNumber] = useState<number | null>(null);
  const [mapFrame, setMapFrame] = useState<Match['frames'][number] | null>(null);
  const [opponentFilter, setOpponentFilter] = useState('');
  const [page, setPage] = useState(0);
  const frameEditForm = useForm<FrameFormValues>({ defaultValues: frameDefaultValues });

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

  // Opponent filter + paging keep the sidebar usable once the log grows long.
  const filteredMatches = useMemo(() => {
    const query = opponentFilter.trim().toLocaleLowerCase();
    if (!query) return matches;
    return matches.filter((match) => match.opponentName.toLocaleLowerCase().includes(query));
  }, [matches, opponentFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredMatches.length / MATCH_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedMatches = filteredMatches.slice(safePage * MATCH_PAGE_SIZE, safePage * MATCH_PAGE_SIZE + MATCH_PAGE_SIZE);

  useEffect(() => {
    if (!activeMatchId && activeMatch) {
      setActiveMatchId(activeMatch.id);
    }
  }, [activeMatch, activeMatchId]);

  // Reset to the first page whenever the filter narrows the result set.
  useEffect(() => {
    setPage(0);
  }, [opponentFilter]);

  const createMatch = useMutation({
    mutationFn: (input: CreateMatchInput) => api.matches.create(token ?? '', input),
    onSuccess: (match) => {
      setServerError(null);
      setShowCreate(false);
      setActiveMatchId(match.id);
      matchForm.reset(matchDefaultValues);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
  });

  const updateMatch = useMutation({
    mutationFn: (input: { id: string; data: CreateMatchInput }) =>
      api.matches.update(token ?? '', input.id, input.data),
    onSuccess: (match) => {
      setServerError(null);
      setShowCreate(false);
      setEditingMatchId(null);
      matchForm.reset(matchDefaultValues);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
  });

  const editFrame = useMutation({
    mutationFn: (input: { matchId: string; frameNumber: number; data: UpdateMatchFrameInput }) =>
      api.matches.updateFrame(token ?? '', input.matchId, input.frameNumber, input.data),
    onSuccess: () => {
      setServerError(null);
      setEditingFrameNumber(null);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
  });

  const removeLastFrame = useMutation({
    mutationFn: (matchId: string) => api.matches.removeLastFrame(token ?? '', matchId),
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['matches', token] });
      queryClient.invalidateQueries({ queryKey: ['player-dashboard', token] });
    },
    onError: (error) => setServerError(errorMessage(error, tErr)),
  });

  const openFrameEdit = (frame: Match['frames'][number]) => {
    setEditingFrameNumber(frame.frameNumber);
    frameEditForm.reset(frameToFormValues(frame));
    setServerError(null);
  };

  const openCreate = (matchType: MatchType = 'match') => {
    setEditingMatchId(null);
    // Pre-fill today's date/time so the coach only adjusts when needed.
    matchForm.reset({ ...matchDefaultValues, matchType, matchDate: toDateTimeLocal(new Date().toISOString()) });
    setServerError(null);
    setShowCreate(true);
  };

  const openEdit = (match: Match) => {
    setEditingMatchId(match.id);
    matchForm.reset(matchToFormValues(match));
    setServerError(null);
    setShowCreate(true);
  };

  const submitMatch = (values: MatchFormValues) => {
    if (editingMatchId) {
      updateMatch.mutate({ id: editingMatchId, data: toCreateMatchInput(values) });
    } else {
      createMatch.mutate(toCreateMatchInput(values));
    }
  };

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
        <PageHeader subtitle={t('authRequired')} title={t('title')} />
        <Link href="/login" className="btn-primary">
          {t('loginCta')}
        </Link>
      </main>
    );
  }

  const profileMissing = profileQuery.data === null;
  const profile = profileQuery.data ?? null;
  const playerName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : t('frames.playerScore');
  const formMatchType = matchForm.watch('matchType');
  const formIsLive = matchForm.watch('isLive');

  return (
    <main className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="surface rounded-xl p-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-primary justify-center" onClick={() => openCreate('match')} type="button">
            <PlusIcon className="h-4 w-4" />
            {t('type.match')}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border-subtle px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
            onClick={() => openCreate('sparring')}
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            {t('type.sparring')}
          </button>
        </div>
        {matches.length > 0 && (
          <div className="relative mt-4">
            <input
              className={`${inputClass} pr-8`}
              onChange={(event) => setOpponentFilter(event.target.value)}
              placeholder={t('filter.opponentPlaceholder')}
              type="search"
              value={opponentFilter}
            />
            {opponentFilter && (
              <button
                aria-label={t('filter.clear')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-disabled transition hover:text-text-primary"
                onClick={() => setOpponentFilter('')}
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className="mt-3 grid gap-2">
          {pagedMatches.map((match) => (
            <button
              key={match.id}
              className={`relative rounded-md border px-3 py-2 pr-16 text-left transition ${
                match.id === activeMatch?.id
                  ? 'border-brand-accent bg-background-elevated text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              onClick={() => setActiveMatchId(match.id)}
              type="button"
            >
              <span className="absolute right-2 top-2">
                <MatchTypeBadge label={t(`type.${match.matchType}`)} type={match.matchType} />
              </span>
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
          {matches.length > 0 && filteredMatches.length === 0 && (
            <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
              {t('filter.noResults')}
            </p>
          )}
        </div>
        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-secondary">
            <button
              className="min-h-9 rounded-md border border-border-subtle px-3 py-1.5 transition hover:border-brand-accent hover:text-text-primary disabled:opacity-40"
              disabled={safePage === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              type="button"
            >
              {t('pagination.prev')}
            </button>
            <span className="tabular-nums">
              {t('pagination.status', {
                from: safePage * MATCH_PAGE_SIZE + 1,
                to: Math.min((safePage + 1) * MATCH_PAGE_SIZE, filteredMatches.length),
                total: filteredMatches.length,
              })}
            </span>
            <button
              className="min-h-9 rounded-md border border-border-subtle px-3 py-1.5 transition hover:border-brand-accent hover:text-text-primary disabled:opacity-40"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              type="button"
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </aside>

      <section className="order-first min-w-0 lg:order-none">
        {profileMissing && (
          <div className="mb-5 rounded-lg border border-state-warning/40 bg-state-warning/10 p-5 text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">{t('profileRequired.title')}</h2>
            <p className="mt-2">{t('profileRequired.description')}</p>
            <Link href="/profile" className="btn-primary mt-4">
              {t('profileRequired.cta')}
            </Link>
          </div>
        )}

        {activeMatch ? (
          <MatchDetail
            addFrame={(values) => addFrame.mutate({ matchId: activeMatch.id, frame: toAddFrameInput(values) })}
            addFrameFromScorer={(result) =>
              addFrame.mutate({ matchId: activeMatch.id, frame: scorerResultToFrameInput(result) })
            }
            addFramePending={addFrame.isPending}
            frameForm={frameForm}
            locale={locale}
            match={activeMatch}
            onEdit={() => openEdit(activeMatch)}
            onEditFrame={openFrameEdit}
            onRemoveLastFrame={() => removeLastFrame.mutate(activeMatch.id)}
            onShowMap={setMapFrame}
            opponentHistory={opponentHistory}
            opponentName={activeMatch.opponentName}
            playerName={playerName}
            removeLastFramePending={removeLastFrame.isPending}
            t={t}
          />
        ) : (
          <div className="surface rounded-xl p-8 text-text-secondary">
            {matchesQuery.isLoading ? t('loading') : t('empty')}
          </div>
        )}
      </section>

      <Modal
        closeLabel={t('newMatch.close')}
        onClose={() => setShowCreate(false)}
        open={showCreate}
        title={
          editingMatchId
            ? formMatchType === 'sparring'
              ? t('type.editSparring')
              : t('newMatch.editTitle')
            : formMatchType === 'sparring'
              ? t('type.newSparring')
              : t('form.title')
        }
      >
        <form className="grid gap-4" onSubmit={matchForm.handleSubmit(submitMatch)}>
          <SegmentedTypeToggle
            onChange={(value) => matchForm.setValue('matchType', value)}
            t={t}
            value={formMatchType}
          />
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2">
            <span className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">{t('live.label')}</span>
              <span className="text-xs text-text-disabled">{t('live.hint')}</span>
            </span>
            <button
              aria-pressed={formIsLive}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${formIsLive ? 'bg-brand-accent' : 'bg-border-subtle'}`}
              onClick={() => matchForm.setValue('isLive', !formIsLive)}
              type="button"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${formIsLive ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </label>
          <FormSection title={t('newMatch.sections.main')}>
            <Field
              error={matchForm.formState.errors.opponentName?.message}
              hint={t('hints.opponentName')}
              label={formMatchType === 'sparring' ? t('fields.sparringPartner') : t('fields.opponentName')}
            >
              <input
                className={inputClass}
                placeholder={t('placeholders.opponentName')}
                {...matchForm.register('opponentName', { required: t('required') })}
              />
            </Field>
            <Field hint={t('hints.matchDate')} label={t('fields.matchDate')}>
              <input className={inputClass} type="datetime-local" {...matchForm.register('matchDate')} />
            </Field>
            {!formIsLive && (
              <div className="grid grid-cols-2 gap-3">
                <Field hint={t('hints.frameScore')} label={t('fields.framesWon')}>
                  <input className={inputClass} min={0} type="number" {...matchForm.register('framesWon')} />
                </Field>
                <Field hint={t('hints.frameScore')} label={t('fields.framesLost')}>
                  <input className={inputClass} min={0} type="number" {...matchForm.register('framesLost')} />
                </Field>
              </div>
            )}
          </FormSection>

          <FormSection title={t('newMatch.sections.context')}>
            <div className="grid grid-cols-2 gap-3">
              <Field hint={t('hints.tournament')} label={t('fields.tournament')}>
                <input className={inputClass} placeholder={t('placeholders.tournament')} {...matchForm.register('tournament')} />
              </Field>
              <Field hint={t('hints.round')} label={t('fields.round')}>
                <input className={inputClass} placeholder={t('placeholders.round')} {...matchForm.register('round')} />
              </Field>
            </div>
            <Field hint={t('hints.format')} label={t('fields.format')}>
              <input className={inputClass} placeholder={t('placeholders.format')} {...matchForm.register('format')} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field hint={t('hints.country')} label={t('fields.country')}>
                <select className={inputClass} {...matchForm.register('country')}>
                  <CountryOptions placeholder={t('placeholders.country')} />
                </select>
              </Field>
              <Field hint={t('hints.city')} label={t('fields.city')}>
                <input className={inputClass} placeholder={t('placeholders.city')} {...matchForm.register('city')} />
              </Field>
              <Field hint={t('hints.club')} label={t('fields.club')}>
                <input className={inputClass} placeholder={t('placeholders.club')} {...matchForm.register('club')} />
              </Field>
            </div>
          </FormSection>

          {!formIsLive && (
          <FormSection title={t('newMatch.sections.stats')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field hint={t('hints.count')} label={t('fields.highBreak')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('highBreak')} />
              </Field>
              <Field hint={t('hints.count')} label={t('fields.breaks50')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('breaks50')} />
              </Field>
              <Field hint={t('hints.count')} label={t('fields.breaks70')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('breaks70')} />
              </Field>
              <Field hint={t('hints.count')} label={t('fields.breaks100')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('breaks100')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field hint={t('hints.percent')} label={t('fields.safetySuccess')}>
                <input className={inputClass} max={100} min={0} type="number" {...matchForm.register('safetySuccess')} />
              </Field>
              <Field hint={t('hints.percent')} label={t('fields.longPotSuccess')}>
                <input className={inputClass} max={100} min={0} type="number" {...matchForm.register('longPotSuccess')} />
              </Field>
              <Field hint={t('hints.count')} label={t('fields.unforcedErrors')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('unforcedErrors')} />
              </Field>
              <Field hint={t('hints.count')} label={t('fields.tacticalErrors')}>
                <input className={inputClass} min={0} type="number" {...matchForm.register('tacticalErrors')} />
              </Field>
            </div>
          </FormSection>
          )}

          <FormSection title={t('newMatch.sections.links')}>
            <Field hint={t('hints.videoUrl')} label={t('fields.videoUrl')}>
              <input className={inputClass} placeholder={t('placeholders.videoUrl')} {...matchForm.register('videoUrl')} />
            </Field>
            <Field hint={t('hints.sourceUrl')} label={t('fields.sourceUrl')}>
              <input className={inputClass} placeholder={t('placeholders.sourceUrl')} {...matchForm.register('sourceUrl')} />
            </Field>
            <Field hint={t('hints.notes')} label={t('fields.notes')}>
              <textarea className={`${inputClass} min-h-20`} placeholder={t('placeholders.notes')} {...matchForm.register('notes')} />
            </Field>
          </FormSection>

          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}
          <button
            className={`${primaryButtonClass} w-full justify-center`}
            disabled={createMatch.isPending || updateMatch.isPending || (!editingMatchId && profileMissing)}
            type="submit"
          >
            {createMatch.isPending || updateMatch.isPending ? t('saving') : t('form.submit')}
          </button>
        </form>
      </Modal>

      <Modal
        closeLabel={t('newMatch.close')}
        onClose={() => setEditingFrameNumber(null)}
        open={editingFrameNumber !== null}
        title={t('frames.editTitle', { number: editingFrameNumber ?? 0 })}
      >
        <form
          className="grid gap-4"
          onSubmit={frameEditForm.handleSubmit((values) => {
            if (activeMatch && editingFrameNumber !== null) {
              editFrame.mutate({ matchId: activeMatch.id, frameNumber: editingFrameNumber, data: toUpdateFrameInput(values) });
            }
          })}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field hint={t('hints.framePoints')} label={playerName}>
              <input className={inputClass} min={0} type="number" {...frameEditForm.register('playerScore')} />
            </Field>
            <Field hint={t('hints.framePoints')} label={activeMatch?.opponentName ?? t('frames.opponentScore')}>
              <input className={inputClass} min={0} type="number" {...frameEditForm.register('opponentScore')} />
            </Field>
            <Field hint={t('hints.count')} label={t('fields.highBreak')}>
              <input className={inputClass} min={0} type="number" {...frameEditForm.register('highBreak')} />
            </Field>
            <Field hint={t('hints.duration')} label={t('frames.duration')}>
              <input className={inputClass} min={1} type="number" {...frameEditForm.register('frameDurationMinutes')} />
            </Field>
          </div>
          <Field hint={t('hints.notes')} label={t('fields.notes')}>
            <input className={inputClass} placeholder={t('placeholders.frameNotes')} {...frameEditForm.register('notes')} />
          </Field>
          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">{serverError}</p>
          )}
          <button className={`${primaryButtonClass} w-full justify-center`} disabled={editFrame.isPending} type="submit">
            {editFrame.isPending ? t('saving') : t('frames.saveEdit')}
          </button>
        </form>
      </Modal>

      <Modal
        closeLabel={t('newMatch.close')}
        onClose={() => setMapFrame(null)}
        open={mapFrame !== null}
        title={t('scorer.mapTitle', { number: mapFrame?.frameNumber ?? 0 })}
      >
        {mapFrame && (
          <FrameMap frame={mapFrame} opponentName={activeMatch?.opponentName ?? ''} playerName={playerName} t={t} />
        )}
      </Modal>
    </main>
  );
}

// Reconstructs a saved frame's per-player ball sequence from its event log.
function FrameMap({
  frame,
  playerName,
  opponentName,
  t,
}: {
  frame: Match['frames'][number];
  playerName: string;
  opponentName: string;
  t: (key: string, values?: Record<string, number>) => string;
}) {
  const events = (frame.scoreEvents ?? []) as ScoreEvent[];
  // Shared and domain ScoreEvent mirror each other (differ only on the optional
  // freeBall flag under exactOptionalPropertyTypes).
  const state = replay(events as DomainScoreEvent[]);
  const sides: Array<{ side: 'player' | 'opponent'; name: string }> = [
    { side: 'player', name: playerName },
    { side: 'opponent', name: opponentName },
  ];
  return (
    <div className="grid gap-3">
      {sides.map(({ side, name }) => (
        <div key={side} className="rounded-lg border border-border-subtle bg-background-primary p-3">
          <p className="mb-2 text-xs font-medium text-text-secondary">{name}</p>
          <BallMap emptyLabel={t('scorer.mapEmpty')} runs={breakRunsFor(state, side)} size="sm" />
        </div>
      ))}
    </div>
  );
}

function SegmentedTypeToggle({
  value,
  onChange,
  t,
}: {
  value: MatchType;
  onChange: (value: MatchType) => void;
  t: (key: string) => string;
}) {
  const options: MatchType[] = ['match', 'sparring'];
  return (
    <div className="inline-flex w-full rounded-md border border-border-subtle p-1">
      {options.map((option) => (
        <button
          key={option}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
            value === option ? 'bg-brand-accent text-background-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => onChange(option)}
          type="button"
        >
          {t(`type.${option}`)}
        </button>
      ))}
    </div>
  );
}

function FullscreenIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {collapsed ? (
        <path d="M9 9 4 4m0 0v4m0-4h4m6 5 5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-5 5 5m0 0v-4m0 4h-4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 9V4m0 0h5M4 4l6 6m10-1V4m0 0h-5m5 0-6 6M4 15v5m0 0h5m-5 0 6-6m10 6-6-6m6 6v-5m0 5h-5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border-subtle p-3">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-brand-accent">{title}</legend>
      {children}
    </fieldset>
  );
}

function MatchDetail({
  addFrame,
  addFrameFromScorer,
  addFramePending,
  frameForm,
  locale,
  match,
  onEdit,
  onEditFrame,
  onRemoveLastFrame,
  onShowMap,
  opponentHistory,
  opponentName,
  playerName,
  removeLastFramePending,
  t,
}: {
  addFrame: (values: FrameFormValues) => void;
  addFrameFromScorer: (result: ScorerResult) => void;
  addFramePending: boolean;
  frameForm: ReturnType<typeof useForm<FrameFormValues>>;
  locale: string;
  match: Match;
  onEdit: () => void;
  onEditFrame: (frame: Match['frames'][number]) => void;
  onRemoveLastFrame: () => void;
  onShowMap: (frame: Match['frames'][number]) => void;
  opponentHistory: OpponentSummary | null;
  opponentName: string;
  playerName: string;
  removeLastFramePending: boolean;
  t: (key: string, values?: Record<string, number | string>) => string;
}) {
  const progress = matchProgress(match);
  const [frameMode, setFrameMode] = useState<'quick' | 'detailed'>('quick');
  // Fullscreen scorer: a focused, mobile-friendly overlay showing only the live
  // ball-by-ball entry for the current frame, nothing else on the page.
  const [scorerFullscreen, setScorerFullscreen] = useState(false);
  // Live matches auto-time each frame: measure the gap since the previous frame
  // was logged (or since the match was opened) and fill the duration for the coach.
  const liveTickRef = useRef<number>(Date.now());
  useEffect(() => {
    liveTickRef.current = Date.now();
  }, [match.id]);

  const onQuickSubmit = (values: FrameFormValues) => {
    if (match.isLive) {
      const minutes = Math.max(1, Math.round((Date.now() - liveTickRef.current) / 60000));
      liveTickRef.current = Date.now();
      addFrame({ ...values, frameDurationMinutes: String(minutes) });
    } else {
      addFrame(values);
    }
  };
  return (
    <div className="grid gap-6">
      <section className="surface rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-text-primary">{match.opponentName}</h2>
              <MatchTypeBadge label={t(`type.${match.matchType}`)} type={match.matchType} />
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {formatDate(match.matchDate, locale)}{match.tournament ? ` · ${match.tournament}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <div className="rounded-md bg-background-elevated px-3 py-2 text-lg font-semibold text-text-primary">
                {match.framesWon}:{match.framesLost}
              </div>
              {progress && (
                <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-accent">
                  {progress.kind === 'plain'
                    ? t('progress.bestOf', { target: progress.target })
                    : t(`progress.${progress.kind}`)}
                </span>
              )}
            </div>
            <button
              className="min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
              onClick={onEdit}
              type="button"
            >
              {t('actions.edit')}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <ResultChip result={match.result} t={t} />
        </div>
        <StatStrip
          className="mt-4"
          items={[
            { label: t('fields.highBreak'), value: formatOptional(match.highBreak) },
            { label: t('fields.breaks50'), value: String(match.breaks50) },
            { label: t('fields.breaks100'), value: String(match.breaks100) },
            { label: t('fields.longPotSuccess'), value: formatPercent(match.longPotSuccess) },
            { label: t('fields.safetySuccess'), value: formatPercent(match.safetySuccess) },
            { label: t('fields.unforcedErrors'), value: formatOptional(match.unforcedErrors) },
            { label: t('fields.tacticalErrors'), value: formatOptional(match.tacticalErrors) },
          ]}
        />
        {match.notes && <p className="mt-4 rounded-md bg-background-primary p-3 text-sm text-text-secondary">{match.notes}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="surface rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-text-primary">{t('frames.title')}</h2>
            {match.frames.length > 0 && (
              <button
                className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:border-state-error hover:text-state-error disabled:opacity-50"
                disabled={removeLastFramePending}
                onClick={onRemoveLastFrame}
                type="button"
              >
                {t('frames.removeLast')}
              </button>
            )}
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-background-primary text-text-disabled">
                <tr>
                  <th className="px-3 py-2 text-left">{t('frames.number')}</th>
                  <th className="px-3 py-2 text-left">{t('frames.score')}</th>
                  <th className="px-3 py-2 text-left">{t('frames.winner')}</th>
                  <th className="px-3 py-2 text-left">{t('fields.highBreak')}</th>
                  <th className="px-3 py-2 text-right">{t('actions.edit')}</th>
                </tr>
              </thead>
              <tbody>
                {match.frames.map((frame) => (
                  <tr key={frame.id} className="border-t border-border-subtle text-text-secondary transition hover:bg-background-elevated/50">
                    <td className="px-3 py-2 text-text-primary">{frame.frameNumber}</td>
                    <td className="px-3 py-2">{formatFrameScore(frame.playerScore, frame.opponentScore)}</td>
                    <td className="px-3 py-2">{frameWinnerLabel(frame.winner, playerName, opponentName, t)}</td>
                    <td className="px-3 py-2">{formatOptional(frame.highBreak)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {frame.scoreEvents && frame.scoreEvents.length > 0 && (
                          <button
                            className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
                            onClick={() => onShowMap(frame)}
                            type="button"
                          >
                            {t('scorer.map')}
                          </button>
                        )}
                        <button
                          className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
                          onClick={() => onEditFrame(frame)}
                          type="button"
                        >
                          {t('actions.edit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {match.frames.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-text-secondary" colSpan={5}>{t('frames.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface h-fit rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{t('opponent.title')}</h2>
          {opponentHistory && (
            <div className="mt-3 grid gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-text-primary">
                  {opponentHistory.wins}–{opponentHistory.losses}
                  {opponentHistory.draws > 0 ? `–${opponentHistory.draws}` : ''}
                </span>
                <span className="text-xs text-text-disabled">{t('opponent.record')}</span>
              </div>
              <StatStrip
                items={[
                  { label: t('opponent.matches'), value: String(opponentHistory.matches) },
                  { label: t('opponent.frames'), value: `${opponentHistory.framesWon}:${opponentHistory.framesLost}` },
                ]}
              />
            </div>
          )}
        </div>
      </section>

      <AccordionSection
        defaultOpen
        subtitle={frameMode === 'quick' ? t('frames.autoHint') : t('scorer.modeDetailedHint')}
        testId="match-frame-form"
        title={t('frames.add')}
      >
        <div className="grid gap-4">
          <div className="inline-flex w-full rounded-md border border-border-subtle p-1 sm:w-auto">
            {(['quick', 'detailed'] as const).map((mode) => (
              <button
                key={mode}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition sm:flex-none sm:px-5 ${
                  frameMode === mode
                    ? 'bg-brand-accent text-background-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setFrameMode(mode)}
                type="button"
              >
                {t(`scorer.mode${mode === 'quick' ? 'Quick' : 'Detailed'}`)}
              </button>
            ))}
          </div>

          {/* Both modes stay mounted; toggling only hides one so the live
              scorer keeps its in-progress break when the coach flips back. */}
          <div className={frameMode === 'quick' ? '' : 'hidden'}>
            <form className="grid gap-4" onSubmit={frameForm.handleSubmit(onQuickSubmit)}>
              <div className={`grid grid-cols-2 gap-3 ${match.isLive ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                <Field hint={t('hints.framePoints')} label={t('scorer.scoreOf', { name: playerName })}>
                  <input className={inputClass} min={0} type="number" {...frameForm.register('playerScore')} />
                </Field>
                <Field hint={t('hints.framePoints')} label={t('scorer.scoreOf', { name: opponentName })}>
                  <input className={inputClass} min={0} type="number" {...frameForm.register('opponentScore')} />
                </Field>
                <Field hint={t('hints.count')} label={t('fields.highBreak')}>
                  <input className={inputClass} min={0} type="number" {...frameForm.register('highBreak')} />
                </Field>
                {/* Live frames are auto-timed; manual duration is hidden. */}
                {!match.isLive && (
                  <Field hint={t('hints.duration')} label={t('frames.duration')}>
                    <input className={inputClass} min={1} type="number" {...frameForm.register('frameDurationMinutes')} />
                  </Field>
                )}
              </div>
              <Field hint={t('hints.notes')} label={t('fields.notes')}>
                <input className={inputClass} placeholder={t('placeholders.frameNotes')} {...frameForm.register('notes')} />
              </Field>
              <button className={`${primaryButtonClass} w-full justify-center sm:w-auto sm:justify-self-end`} disabled={addFramePending} type="submit">
                {addFramePending ? t('saving') : t('frames.submit')}
              </button>
            </form>
          </div>
          <div className={frameMode === 'detailed' ? '' : 'hidden'}>
            {/* One FrameScorer instance, re-parented only via className so the
                in-progress break survives toggling fullscreen on/off. */}
            <div
              className={
                scorerFullscreen
                  ? 'fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background-primary p-4 sm:p-6'
                  : 'grid gap-3'
              }
            >
              <div className="flex items-center justify-between gap-2">
                {scorerFullscreen && (
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                    {playerName} — {opponentName}
                  </span>
                )}
                <button
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
                  onClick={() => setScorerFullscreen((current) => !current)}
                  type="button"
                >
                  <FullscreenIcon collapsed={scorerFullscreen} />
                  {scorerFullscreen ? t('scorer.collapse') : t('scorer.expand')}
                </button>
              </div>
              {/* Remount (fresh frame) after each saved frame so the scorer can't
                  re-submit the same break as a duplicate. */}
              <FrameScorer
                key={match.frames.length}
                onSave={addFrameFromScorer}
                opponentName={opponentName}
                playerName={playerName}
                saving={addFramePending}
                t={t}
              />
            </div>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// Compact, modern stat row: tiny uppercase labels over tabular values,
// separated by subtle dividers — far less vertical space than bordered tiles.
function StatStrip({ items, className = '' }: { items: Array<{ label: string; value: string }>; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-3 ${className}`}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex flex-col ${index > 0 ? 'border-l border-border-subtle pl-5' : ''}`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-disabled">{item.label}</span>
          <span className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function ResultChip({
  result,
  t,
}: {
  result: Match['result'];
  t: (key: string) => string;
}) {
  const tone =
    result === 'player_win'
      ? 'border-state-success/40 bg-state-success/10 text-state-success'
      : result === 'opponent_win'
        ? 'border-state-error/40 bg-state-error/10 text-state-error'
        : 'border-border-subtle bg-background-primary text-text-secondary';
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}>
      {t(`result.${result}`)}
    </span>
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

function matchToFormValues(match: Match): MatchFormValues {
  const numToStr = (value: number | undefined | null): string =>
    value === undefined || value === null ? '' : String(value);
  return {
    matchType: match.matchType,
    isLive: match.isLive,
    matchDate: match.matchDate ? toDateTimeLocal(match.matchDate) : '',
    opponentName: match.opponentName,
    tournament: match.tournament ?? '',
    round: match.round ?? '',
    format: match.format ?? '',
    country: match.country ?? '',
    city: match.city ?? '',
    club: match.club ?? '',
    framesWon: numToStr(match.framesWon),
    framesLost: numToStr(match.framesLost),
    highBreak: numToStr(match.highBreak),
    breaks50: numToStr(match.breaks50),
    breaks70: numToStr(match.breaks70),
    breaks100: numToStr(match.breaks100),
    safetySuccess: numToStr(match.safetySuccess),
    longPotSuccess: numToStr(match.longPotSuccess),
    unforcedErrors: numToStr(match.unforcedErrors),
    tacticalErrors: numToStr(match.tacticalErrors),
    sourceUrl: match.sourceUrl ?? '',
    videoUrl: match.videoUrl ?? '',
    notes: match.notes ?? '',
  };
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toCreateMatchInput(values: MatchFormValues): CreateMatchInput {
  const input: CreateMatchInput = {
    opponentName: values.opponentName,
    matchType: values.matchType,
    isLive: values.isLive,
  };
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
  // Frame number is auto-assigned by the API; the winner is derived from the
  // entered scores so the coach only types the points.
  const input: AddMatchFrameInput = { winner: deriveFrameWinner(values.playerScore, values.opponentScore) };
  const durationMinutes = parseOptionalInt(values.frameDurationMinutes);
  assignInt(input, 'playerScore', values.playerScore);
  assignInt(input, 'opponentScore', values.opponentScore);
  assignInt(input, 'highBreak', values.highBreak);
  if (durationMinutes !== undefined) input.frameDurationSec = durationMinutes * 60;
  assignText(input, 'notes', values.notes);
  return input;
}

// Build a frame payload from the live scorer: the event log is authoritative,
// and the server recomputes totals from it, but we send the derived numbers too
// so the optimistic UI and any non-event consumers stay consistent.
function scorerResultToFrameInput(result: ScorerResult): AddMatchFrameInput {
  const winner: FrameWinner =
    result.playerScore > result.opponentScore
      ? 'player'
      : result.opponentScore > result.playerScore
        ? 'opponent'
        : 'unknown';
  const input: AddMatchFrameInput = {
    winner,
    playerScore: result.playerScore,
    opponentScore: result.opponentScore,
    scoreEvents: result.scoreEvents as AddMatchFrameInput['scoreEvents'],
  };
  if (result.highBreak > 0) input.highBreak = result.highBreak;
  return input;
}

function frameWinnerLabel(
  winner: FrameWinner,
  playerName: string,
  opponentName: string,
  t: (key: string) => string,
): string {
  if (winner === 'player') return playerName;
  if (winner === 'opponent') return opponentName;
  return t('winner.unknown');
}

// Parse a free-text format ("best of 7", "до 4", "race to 3") into the frames
// needed to win, then label where the match stands. Pure heuristic, no new data.
function matchProgress(
  match: Match,
): { kind: 'plain' | 'frameBall' | 'matchBall' | 'decider'; target: number } | null {
  const numbers = (match.format ?? '').match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  const raw = Number.parseInt(numbers[0]!, 10);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  // "best of N" → first to ceil(N/2); "race to N" / "до N" → N directly.
  const isBestOf = /best\s*of|bo\b/i.test(match.format ?? '');
  const target = isBestOf ? Math.floor(raw / 2) + 1 : raw;
  const leader = Math.max(match.framesWon, match.framesLost);
  if (match.framesWon === target || match.framesLost === target) return null; // finished
  if (leader === target - 1 && match.framesWon === match.framesLost) {
    return { kind: 'decider', target };
  }
  if (match.framesWon === target - 1 || match.framesLost === target - 1) {
    const kind = match.framesWon === target - 1 ? 'matchBall' : 'frameBall';
    return { kind, target };
  }
  return { kind: 'plain', target };
}

function frameToFormValues(frame: Match['frames'][number]): FrameFormValues {
  const numToStr = (value: number | undefined | null): string =>
    value === undefined || value === null ? '' : String(value);
  return {
    playerScore: numToStr(frame.playerScore),
    opponentScore: numToStr(frame.opponentScore),
    highBreak: numToStr(frame.highBreak),
    frameDurationMinutes: frame.frameDurationSec ? String(Math.round(frame.frameDurationSec / 60)) : '',
    notes: frame.notes ?? '',
  };
}

function toUpdateFrameInput(values: FrameFormValues): UpdateMatchFrameInput {
  const input: UpdateMatchFrameInput = {};
  assignInt(input, 'playerScore', values.playerScore);
  assignInt(input, 'opponentScore', values.opponentScore);
  assignInt(input, 'highBreak', values.highBreak);
  const durationMinutes = parseOptionalInt(values.frameDurationMinutes);
  if (durationMinutes !== undefined) input.frameDurationSec = durationMinutes * 60;
  assignText(input, 'notes', values.notes);
  return input;
}

function deriveFrameWinner(playerScore: string, opponentScore: string): FrameWinner {
  const player = parseOptionalInt(playerScore);
  const opponent = parseOptionalInt(opponentScore);
  if (player === undefined || opponent === undefined || player === opponent) return 'unknown';
  return player > opponent ? 'player' : 'opponent';
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
const primaryButtonClass = 'btn-primary';
