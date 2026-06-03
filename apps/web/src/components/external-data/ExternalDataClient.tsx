'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ExternalImportJob, ExternalPlayerLink } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { PageHeader } from '@/components/ui';
import { api, ApiError, type ImportedMatch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

type ExternalMatchNotes = {
  source?: string;
  referee?: string | null;
  headToHeadUrl?: string | null;
  playerIsFirst?: boolean | null;
  matchProgress?: string[];
  points?: {
    for?: number;
    against?: number;
    avgFor?: number | null;
    avgAgainst?: number | null;
    avgTotal?: number | null;
  };
  breaks?: {
    player?: number[];
    opponent?: number[];
    profile?: {
      player?: BreakProfile | null;
      opponent?: BreakProfile | null;
    } | null;
  };
};

type BreakProfile = {
  breaks50?: number;
  breaks60?: number;
  breaks70?: number;
  breaks80?: number;
  breaks90?: number;
  breaks100?: number;
  total50Plus?: number;
};

type ExternalFrameNotes = {
  rawScore?: string;
  playerBreaks?: number[];
  opponentBreaks?: number[];
};

export function ExternalDataClient() {
  const t = useTranslations('externalData');
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);

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

  return <AuthenticatedView token={token} />;
}

function AuthenticatedView({ token }: { token: string }) {
  const t = useTranslations('externalData');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'matches' | 'sources'>('matches');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());

  const linksQuery = useQuery({
    queryKey: ['external-links', token],
    queryFn: () => api.externalSources.listLinks(token),
  });

  const matchesQuery = useQuery({
    queryKey: ['imported-matches', token],
    queryFn: () => api.externalSources.listImportedMatches(token),
  });

  const createLink = useMutation({
    mutationFn: (url: string) => api.externalSources.createLink(token, { url }),
    onSuccess: () => {
      setUrlInput('');
      queryClient.invalidateQueries({ queryKey: ['external-links', token] });
    },
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) => api.externalSources.deleteLink(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external-links', token] }),
  });

  const triggerSync = useMutation({
    mutationFn: (id: string) => api.externalSources.triggerSync(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links', token] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['imported-matches', token] }), 5000);
    },
  });

  const generateAnalysis = useMutation({
    mutationFn: () => {
      const now = new Date();
      const periodEnd = now.toISOString().slice(0, 10);
      const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return api.ai.generateWeeklyReport(token, { locale: locale as 'ru' | 'en' | 'uk', periodStart, periodEnd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports', token] });
    },
  });

  const generateExternalAnalysis = useMutation({
    mutationFn: () =>
      api.ai.generateExternalMatchReport(token, {
        matchIds: Array.from(selectedMatchIds),
        locale: locale as 'ru' | 'en' | 'uk',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-reports', token] });
      setSelectedMatchIds(new Set());
    },
  });

  const links = linksQuery.data ?? [];
  const matches = matchesQuery.data ?? [];

  function toggleSelectAll() {
    if (selectedMatchIds.size === matches.length && matches.length > 0) {
      setSelectedMatchIds(new Set());
    } else {
      setSelectedMatchIds(new Set(matches.map((m) => m.id)));
    }
  }

  return (
    <main className="grid gap-6">
      <PageHeader
        actions={
          selectedMatchIds.size > 0 ? (
            <button className="btn-primary" disabled={generateExternalAnalysis.isPending} onClick={() => generateExternalAnalysis.mutate()}>
              <AiIcon />
              {generateExternalAnalysis.isPending
                ? t('analysisPending')
                : t('analyzeSelected', { count: selectedMatchIds.size })}
            </button>
          ) : (
            <button className="btn-primary" disabled={generateAnalysis.isPending || matches.length === 0} onClick={() => generateAnalysis.mutate()}>
              <AiIcon />
              {generateAnalysis.isPending ? t('analysisPending') : t('analyzeWithAi')}
            </button>
          )
        }
        subtitle={t('subtitle')}
        title={t('title')}
      />

      {(generateAnalysis.isError || generateExternalAnalysis.isError) && (
        <div className="rounded-lg border border-state-error/40 bg-state-error/10 p-4">
          <p className="text-sm text-state-error">
            {t('analysisError')}
          </p>
        </div>
      )}

      {(generateAnalysis.isSuccess || generateExternalAnalysis.isSuccess) && (
        <div className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 p-4">
          <p className="text-sm text-text-primary">
            {t('analysisQueued')}{' '}
            <Link href="/ai" className="underline hover:text-brand-accent">
              {t('viewReports')}
            </Link>
          </p>
        </div>
      )}

      <section className="surface rounded-xl p-5">
        <h2 className="text-lg font-medium text-text-primary">{t('addSource')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('addSourceHint')}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (urlInput.trim()) createLink.mutate(urlInput.trim());
          }}
        >
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://cuetracker.net/players/... or https://www.wst.tv/players/..."
            className="flex-1 rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={createLink.isPending || !urlInput.trim()}
            className="btn-primary text-sm"
          >
            {t('connect')}
          </button>
        </form>
        {createLink.isError && (
          <p className="mt-2 text-sm text-state-error">
            {createLink.error instanceof ApiError ? t('linkError') : t('genericError')}
          </p>
        )}
      </section>

      {links.length > 0 && (
        <section className="surface rounded-xl p-5">
          <h2 className="text-lg font-medium text-text-primary">{t('connectedSources')}</h2>
          <div className="mt-3 grid gap-3">
            {links.map((link) => (
              <SourceCard
                key={link.id}
                link={link}
                token={token}
                onSync={() => triggerSync.mutate(link.id)}
                onDelete={() => deleteLink.mutate(link.id)}
                isSyncing={triggerSync.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'matches'
              ? 'border-b-2 border-brand-accent text-brand-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('importedMatches')} ({matches.length})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'sources'
              ? 'border-b-2 border-brand-accent text-brand-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('syncHistory')}
        </button>
      </div>

      {activeTab === 'matches' && (
        <MatchesTable
          matches={matches}
          expandedMatch={expandedMatch}
          onToggle={(id) => setExpandedMatch(expandedMatch === id ? null : id)}
          selectedMatchIds={selectedMatchIds}
          onToggleSelect={(id) =>
            setSelectedMatchIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onSelectAll={toggleSelectAll}
        />
      )}

      {activeTab === 'sources' && links.length > 0 && (
        <SyncHistoryPanel links={links} token={token} />
      )}

      {matchesQuery.isLoading && (
        <p className="text-center text-text-secondary">{t('loading')}</p>
      )}
    </main>
  );
}

function SourceCard({
  link,
  token,
  onSync,
  onDelete,
  isSyncing,
}: {
  link: ExternalPlayerLink;
  token: string;
  onSync: () => void;
  onDelete: () => void;
  isSyncing: boolean;
}) {
  const t = useTranslations('externalData');
  const sourceLabel = link.source === 'wst' ? 'World Snooker Tour' : 'CueTracker';
  const sourceColor = link.source === 'wst' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400';

  return (
    <div className="flex items-center justify-between rounded-md border border-border-subtle bg-background-primary p-3">
      <div className="flex items-center gap-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${sourceColor}`}>{sourceLabel}</span>
        <div>
          <p className="text-sm font-medium text-text-primary">
            {link.displayName ?? link.externalId}
          </p>
          <p className="text-xs text-text-secondary">
            {link.lastSyncedAt ? `${t('lastSync')}: ${new Date(link.lastSyncedAt).toLocaleDateString()}` : t('neverSynced')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="rounded-md bg-brand-primary/20 px-3 py-1 text-xs font-medium text-brand-accent transition hover:bg-brand-primary/40 disabled:opacity-50"
        >
          {t('sync')}
        </button>
        <button
          onClick={onDelete}
          className="rounded-md bg-state-error/10 px-3 py-1 text-xs font-medium text-state-error transition hover:bg-state-error/20"
        >
          {t('remove')}
        </button>
      </div>
    </div>
  );
}

function MatchesTable({
  matches,
  expandedMatch,
  onToggle,
  selectedMatchIds,
  onToggleSelect,
  onSelectAll,
}: {
  matches: ImportedMatch[];
  expandedMatch: string | null;
  onToggle: (id: string) => void;
  selectedMatchIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}) {
  const t = useTranslations('externalData');

  if (matches.length === 0) {
    return (
      <div className="surface rounded-xl p-8 text-center">
        <p className="text-text-secondary">{t('noMatches')}</p>
        <p className="mt-2 text-sm text-text-disabled">{t('noMatchesHint')}</p>
      </div>
    );
  }

  const allSelected = selectedMatchIds.size === matches.length;
  const someSelected = selectedMatchIds.size > 0 && !allSelected;

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full text-sm">
        <thead className="bg-background-secondary text-left text-text-secondary">
          <tr>
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={onSelectAll}
                className="h-4 w-4 cursor-pointer accent-brand-accent"
                title={allSelected ? t('deselectAll') : t('selectAll')}
              />
            </th>
            <th className="px-3 py-2">{t('date')}</th>
            <th className="px-3 py-2">{t('tournament')}</th>
            <th className="px-3 py-2">{t('opponent')}</th>
            <th className="px-3 py-2">{t('score')}</th>
            <th className="px-3 py-2">{t('result')}</th>
            <th className="px-3 py-2">{t('highBreak')}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              isExpanded={expandedMatch === match.id}
              isSelected={selectedMatchIds.has(match.id)}
              onToggle={() => onToggle(match.id)}
              onToggleSelect={() => onToggleSelect(match.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchRow({
  match,
  isExpanded,
  isSelected,
  onToggle,
  onToggleSelect,
}: {
  match: ImportedMatch;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onToggleSelect: () => void;
}) {
  const t = useTranslations('externalData');
  const notes = parseJson<ExternalMatchNotes>(match.notes);
  const resultColor =
    match.result === 'player_win'
      ? 'text-green-400'
      : match.result === 'opponent_win'
        ? 'text-state-error'
        : 'text-text-secondary';

  const resultLabel =
    match.result === 'player_win' ? 'W' : match.result === 'opponent_win' ? 'L' : 'D';

  return (
    <>
      <tr
        className={`border-t border-border-subtle transition hover:bg-background-elevated ${isSelected ? 'bg-brand-primary/10' : ''}`}
      >
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 cursor-pointer accent-brand-accent"
          />
        </td>
        <td
          className="cursor-pointer px-3 py-2 text-text-secondary"
          onClick={onToggle}
        >
          {new Date(match.matchDate).toLocaleDateString()}
        </td>
        <td className="cursor-pointer px-3 py-2 text-text-primary" onClick={onToggle}>
          {match.tournament ?? '—'}
        </td>
        <td className="cursor-pointer px-3 py-2 font-medium text-text-primary" onClick={onToggle}>
          {match.opponentName}
        </td>
        <td className="cursor-pointer px-3 py-2 text-text-primary" onClick={onToggle}>
          {match.framesWon}–{match.framesLost}
        </td>
        <td className={`cursor-pointer px-3 py-2 font-semibold ${resultColor}`} onClick={onToggle}>
          {resultLabel}
        </td>
        <td className="cursor-pointer px-3 py-2 text-text-secondary" onClick={onToggle}>
          {match.highBreak ?? '—'}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-background-elevated px-4 py-3">
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <DetailItem label={t('round')} value={match.round} />
                <DetailItem label={t('format')} value={match.format} />
                <DetailItem label={t('referee')} value={notes?.referee ?? null} />
                <DetailItem label={t('points')} value={`${notes?.points?.for ?? 0}–${notes?.points?.against ?? 0}`} />
                <DetailItem
                  label={t('avgPointsFrame')}
                  value={formatAverageLine(notes?.points?.avgFor, notes?.points?.avgAgainst, notes?.points?.avgTotal)}
                />
                <DetailItem label={t('decidingFrame')} value={formatFrameWinner(match.decidingFrameResult, t)} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('breaks')}</h4>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <BreakLine label={t('playerBreaks')} values={notes?.breaks?.player ?? []} />
                  <BreakLine label={t('opponentBreaks')} values={notes?.breaks?.opponent ?? []} />
                </div>
                <p className="mt-2 text-xs text-text-disabled">
                  {t('breakSummary', {
                    b50: match.breaks50,
                    b70: match.breaks70,
                    b100: match.breaks100,
                    high: match.highBreak ?? 0,
                  })}
                </p>
              </div>

              {notes?.matchProgress && notes.matchProgress.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('matchProgress')}</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {notes.matchProgress.map((score) => (
                      <span key={score} className="rounded bg-background-secondary px-2 py-0.5 font-mono text-xs text-text-secondary">
                        {score}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {match.frames.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('frameScores')}</h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {match.frames.map((frame) => (
                      <FrameDetail key={frame.frameNumber} frame={frame} />
                    ))}
                  </div>
                </div>
              )}

              {(notes?.headToHeadUrl || match.sourceUrl) && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {notes?.headToHeadUrl && (
                    <a href={notes.headToHeadUrl} target="_blank" rel="noreferrer" className="text-brand-accent underline-offset-2 hover:underline">
                      {t('openHeadToHead')}
                    </a>
                  )}
                  {match.sourceUrl && (
                    <a href={match.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-accent underline-offset-2 hover:underline">
                      {t('openSource')}
                    </a>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-text-disabled">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value || '—'}</p>
    </div>
  );
}

function BreakLine({ label, values }: { label: string; values: number[] }) {
  return (
    <div className="rounded-md bg-background-secondary px-3 py-2">
      <p className="text-xs text-text-disabled">{label}</p>
      <p className="mt-1 font-mono text-sm text-text-primary">{values.length > 0 ? values.join(', ') : '—'}</p>
    </div>
  );
}

function FrameDetail({ frame }: { frame: ImportedMatch['frames'][number] }) {
  const t = useTranslations('externalData');
  const notes = parseJson<ExternalFrameNotes>(frame.notes);
  const color =
    frame.winner === 'player'
      ? 'border-green-500/40 bg-green-950/20'
      : frame.winner === 'opponent'
        ? 'border-red-500/40 bg-red-950/20'
        : 'border-border-subtle bg-background-secondary';

  return (
    <div className={`rounded-md border px-3 py-2 ${color}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-disabled">{t('frameNumber', { number: frame.frameNumber })}</span>
        <span className="font-mono text-sm font-semibold text-text-primary">
          {frame.playerScore ?? 0}–{frame.opponentScore ?? 0}
        </span>
      </div>
      {notes?.rawScore && <p className="mt-1 font-mono text-xs text-text-secondary">{notes.rawScore}</p>}
      <p className="mt-1 text-xs text-text-disabled">
        {t('frameBreaks', {
          player: formatBreakList(notes?.playerBreaks ?? []),
          opponent: formatBreakList(notes?.opponentBreaks ?? []),
        })}
      </p>
    </div>
  );
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatAverageLine(
  player: number | null | undefined,
  opponent: number | null | undefined,
  total: number | null | undefined,
): string | null {
  if (player == null && opponent == null && total == null) return null;
  return `${formatNumber(player)}–${formatNumber(opponent)} (${formatNumber(total)})`;
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}

function formatBreakList(values: number[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

function formatFrameWinner(
  value: string | null,
  t: (key: 'player' | 'opponent' | 'unknown') => string,
): string | null {
  if (value === 'player') return t('player');
  if (value === 'opponent') return t('opponent');
  if (value === 'unknown') return t('unknown');
  return null;
}

function SyncHistoryPanel({ links, token }: { links: ExternalPlayerLink[]; token: string }) {
  const t = useTranslations('externalData');

  return (
    <div className="grid gap-4">
      {links.map((link) => (
        <SyncHistoryForLink key={link.id} link={link} token={token} />
      ))}
    </div>
  );
}

function SyncHistoryForLink({ link, token }: { link: ExternalPlayerLink; token: string }) {
  const t = useTranslations('externalData');
  const jobsQuery = useQuery({
    queryKey: ['external-jobs', link.id, token],
    queryFn: () => api.externalSources.listJobs(token, link.id),
    refetchInterval: (query) => {
      const jobs = query.state.data ?? [];
      return jobs.some((j) => j.status === 'queued' || j.status === 'running') ? 3000 : false;
    },
  });

  const jobs = jobsQuery.data ?? [];
  const sourceLabel = link.source === 'wst' ? 'WST' : 'CueTracker';

  return (
    <div className="surface rounded-xl p-4">
      <h3 className="text-sm font-medium text-text-primary">
        {sourceLabel}: {link.displayName ?? link.externalId}
      </h3>
      {jobs.length === 0 && (
        <p className="mt-2 text-sm text-text-secondary">{t('noJobs')}</p>
      )}
      {jobs.length > 0 && (
        <div className="mt-2 grid gap-1">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({ job }: { job: ExternalImportJob }) {
  const statusColors: Record<string, string> = {
    queued: 'bg-yellow-900/30 text-yellow-400',
    running: 'bg-blue-900/30 text-blue-400',
    completed: 'bg-green-900/30 text-green-400',
    failed: 'bg-red-900/30 text-red-400',
  };

  return (
    <div className="flex items-center justify-between rounded px-2 py-1 text-xs">
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 font-medium ${statusColors[job.status] ?? ''}`}>
          {job.status}
        </span>
        <span className="text-text-secondary">
          {new Date(job.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="flex gap-3 text-text-secondary">
        {job.matchesImported > 0 && <span>+{job.matchesImported} matches</span>}
        {job.matchesSkipped > 0 && <span>{job.matchesSkipped} skipped</span>}
        {job.errorMessage && <span className="text-state-error">{job.errorMessage}</span>}
      </div>
    </div>
  );
}

function AiIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
