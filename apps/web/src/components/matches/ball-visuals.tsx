'use client';

import type { BreakRun, ScoringBall } from '@snooker/snooker-domain';
import type { MatchType } from '@snooker/shared';

// Cushion-cloth-accurate ball colours. Kept here (not Tailwind) because the
// snooker palette (brown, pink) isn't part of the design-token set.
export const BALL_HEX: Record<ScoringBall, string> = {
  red: '#c0392b',
  yellow: '#f1c40f',
  green: '#1e8449',
  brown: '#7e5109',
  blue: '#2471a3',
  pink: '#ec7faf',
  black: '#17202a',
};

const LIGHT_BALLS: ScoringBall[] = ['yellow', 'pink'];

export function Ball({
  ball,
  size = 'md',
  freeBall = false,
  title,
}: {
  ball: ScoringBall;
  size?: 'sm' | 'md';
  freeBall?: boolean;
  title?: string;
}) {
  const dimension = size === 'sm' ? 'h-4 w-4 text-[9px]' : 'h-6 w-6 text-[11px]';
  const textColor = LIGHT_BALLS.includes(ball) ? '#1a1a1a' : '#ffffff';
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold shadow-sm ring-1 ring-black/30 ${dimension} ${
        freeBall ? 'outline outline-2 outline-offset-1 outline-brand-accent' : ''
      }`}
      style={{ backgroundColor: BALL_HEX[ball], color: textColor }}
      title={title}
    />
  );
}

// A per-side sequence map: each visit (break) is a grouped chip of potted balls
// with its point total — the coach can read the rhythm of the frame at a glance.
export function BallMap({
  runs,
  emptyLabel,
  size = 'md',
}: {
  runs: BreakRun[];
  emptyLabel: string;
  size?: 'sm' | 'md';
}) {
  if (runs.length === 0) {
    return <p className="text-xs text-text-disabled">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {runs.map((run, index) => (
        <span
          key={index}
          className="flex max-w-full flex-wrap items-center gap-1 rounded-md border border-border-subtle bg-background-primary px-1.5 py-1"
        >
          {run.balls.map((ball, ballIndex) => (
            <Ball key={ballIndex} ball={ball} size={size} />
          ))}
          <span className="ml-0.5 text-[11px] font-semibold text-text-secondary">{run.points}</span>
        </span>
      ))}
    </div>
  );
}

export function MatchTypeBadge({ type, label }: { type: MatchType; label: string }) {
  const tone =
    type === 'sparring'
      ? 'border-state-info/40 bg-state-info/10 text-state-info'
      : 'border-brand-accent/40 bg-brand-accent/10 text-brand-accent';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
