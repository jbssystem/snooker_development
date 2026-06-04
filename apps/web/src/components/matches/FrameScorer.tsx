'use client';

import { useMemo, useReducer } from 'react';
import {
  applyFoul,
  applyFreeBall,
  applyMiss,
  applyPot,
  applySafety,
  ballOn,
  breakRunsFor,
  createFrame,
  frameOutcome,
  switchPlayer,
  undo,
  type FrameScoreState,
  type ScoringBall,
} from '@snooker/snooker-domain';
import { useHotkey } from '@/lib/use-hotkeys';
import { BALL_HEX, Ball, BallMap } from './ball-visuals';

type Translate = (key: string, values?: Record<string, string | number>) => string;

// What the parent needs to persist a frame entered via the live scorer.
export type ScorerResult = {
  playerScore: number;
  opponentScore: number;
  highBreak: number;
  scoreEvents: FrameScoreState['events'];
};

const ALL_BALLS: ScoringBall[] = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];
const FOUL_VALUES = [4, 5, 6, 7];

// Point value doubles as the keyboard shortcut for potting each ball.
const BALL_POINTS: Record<ScoringBall, number> = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
};
// Light glance highlight to give each ball a glossy, 3D sphere look.
function ballSheen(hex: string): string {
  return `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), rgba(255,255,255,0) 42%), radial-gradient(circle at 68% 78%, rgba(0,0,0,0.35), rgba(0,0,0,0) 55%), ${hex}`;
}

type Action =
  | { kind: 'pot'; ball: ScoringBall }
  | { kind: 'freeBall' }
  | { kind: 'foul'; value: number }
  | { kind: 'safety' }
  | { kind: 'miss' }
  | { kind: 'switch' }
  | { kind: 'undo' }
  | { kind: 'reset' };

function reducer(state: FrameScoreState, action: Action): FrameScoreState {
  switch (action.kind) {
    case 'pot':
      return applyPot(state, action.ball);
    case 'freeBall':
      return applyFreeBall(state);
    case 'foul':
      return applyFoul(state, action.value);
    case 'safety':
      return applySafety(state);
    case 'miss':
      return applyMiss(state);
    case 'switch':
      return switchPlayer(state);
    case 'undo':
      return undo(state);
    case 'reset':
      return createFrame();
    default:
      return state;
  }
}

export function FrameScorer({
  playerName,
  opponentName,
  onSave,
  saving,
  t,
}: {
  playerName: string;
  opponentName: string;
  onSave: (result: ScorerResult) => void;
  saving: boolean;
  t: Translate;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createFrame());
  const allowed = useMemo(() => new Set(ballOn(state)), [state]);
  const outcome = frameOutcome(state);
  const hasEvents = state.events.length > 0;
  const live = !state.finished;

  // Keyboard shortcuts: ball point value pots that ball, plus turn controls.
  const potByPoints = (points: number) => {
    const ball = ALL_BALLS.find((b) => BALL_POINTS[b] === points);
    if (ball && allowed.has(ball) && live) dispatch({ kind: 'pot', ball });
  };
  useHotkey('1', () => potByPoints(1), { enabled: live });
  useHotkey('2', () => potByPoints(2), { enabled: live });
  useHotkey('3', () => potByPoints(3), { enabled: live });
  useHotkey('4', () => potByPoints(4), { enabled: live });
  useHotkey('5', () => potByPoints(5), { enabled: live });
  useHotkey('6', () => potByPoints(6), { enabled: live });
  useHotkey('7', () => potByPoints(7), { enabled: live });
  useHotkey('s', () => dispatch({ kind: 'safety' }), { enabled: live });
  useHotkey('e', () => dispatch({ kind: 'switch' }), { enabled: live });
  useHotkey('u', () => hasEvents && dispatch({ kind: 'undo' }), { enabled: hasEvents });

  const sides = [
    { side: 'player' as const, name: playerName, score: state.scores.player, high: state.highBreaks.player },
    { side: 'opponent' as const, name: opponentName, score: state.scores.opponent, high: state.highBreaks.opponent },
  ];

  return (
    <div className="grid gap-4">
      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ side, name, score, high }) => {
          const atTable = state.currentPlayer === side && !state.finished;
          return (
            <div
              key={side}
              className={`rounded-xl border p-3 transition ${
                atTable
                  ? 'border-brand-accent bg-background-elevated shadow-elev-2 ring-1 ring-brand-accent/30'
                  : 'border-border-subtle bg-background-secondary shadow-elev-1'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-text-primary">{name}</span>
                {atTable && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-brand-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                    {t('scorer.atTable')}
                  </span>
                )}
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums text-text-primary">{score}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-text-disabled">
                {atTable && <span>{t('scorer.break')}: {state.currentBreak}</span>}
                <span>{t('scorer.highBreak')}: {high}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Frame status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span>
          {t('scorer.phase')}: {state.phase === 'reds' ? t('scorer.phaseReds') : t('scorer.phaseColors')}
        </span>
        {state.phase === 'reds' && <span>{t('scorer.remainingReds')}: {state.redsRemaining}</span>}
        {state.finished ? (
          <span className="font-semibold text-state-success">{t('scorer.frameOver')}</span>
        ) : (
          <span className="flex items-center gap-1.5">
            {t('scorer.nextOn')}
            {[...allowed].map((ball) => (
              <Ball key={ball} ball={ball} size="sm" />
            ))}
          </span>
        )}
      </div>

      {/* Ball palette — glossy spheres labelled with their point value (= hotkey) */}
      <div className="flex flex-wrap gap-2.5">
        {ALL_BALLS.map((ball) => {
          const enabled = allowed.has(ball) && !state.finished;
          return (
            <button
              key={ball}
              className="press flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white shadow-elev-2 ring-1 ring-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none"
              disabled={!enabled}
              onClick={() => dispatch({ kind: 'pot', ball })}
              style={{ background: ballSheen(BALL_HEX[ball]) }}
              title={`${t(`scorer.balls.${ball}`)} (${BALL_POINTS[ball]})`}
              type="button"
            >
              <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{BALL_POINTS[ball]}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 text-sm">
        {FOUL_VALUES.map((value) => (
          <button
            key={value}
            className="rounded-md border border-state-error/40 px-2.5 py-1.5 font-medium text-state-error transition hover:bg-state-error/10 disabled:opacity-40"
            disabled={state.finished}
            onClick={() => dispatch({ kind: 'foul', value })}
            type="button"
          >
            {t('scorer.foul')} {value}
          </button>
        ))}
        <button
          className={actionBtn}
          disabled={state.finished || allowed.size === 0}
          onClick={() => dispatch({ kind: 'freeBall' })}
          type="button"
        >
          {t('scorer.freeBall')}
        </button>
        <button className={actionBtn} disabled={state.finished} onClick={() => dispatch({ kind: 'safety' })} type="button">
          {t('scorer.safety')} <Kbd>S</Kbd>
        </button>
        <button
          className="press inline-flex items-center gap-1.5 rounded-md border border-brand-accent bg-brand-accent/15 px-3 py-1.5 font-semibold text-brand-accent transition hover:bg-brand-accent/25 disabled:opacity-40"
          disabled={state.finished}
          onClick={() => dispatch({ kind: 'switch' })}
          type="button"
        >
          {t('scorer.endTurn')} → <Kbd>E</Kbd>
        </button>
        <button className={actionBtn} disabled={!hasEvents} onClick={() => dispatch({ kind: 'undo' })} type="button">
          {t('scorer.undo')} <Kbd>U</Kbd>
        </button>
        <button className={actionBtn} disabled={!hasEvents} onClick={() => dispatch({ kind: 'reset' })} type="button">
          {t('scorer.rerack')}
        </button>
      </div>

      {/* Per-player ball-sequence map */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map(({ side, name }) => (
          <div key={side} className="sunken rounded-lg border border-border-subtle p-3">
            <p className="mb-2 text-xs font-medium text-text-secondary">{name}</p>
            <BallMap emptyLabel={t('scorer.mapEmpty')} runs={breakRunsFor(state, side)} size="sm" />
          </div>
        ))}
      </div>

      <button
        className="btn-primary w-full justify-center"
        disabled={saving || !hasEvents}
        onClick={() =>
          onSave({
            playerScore: outcome.playerScore,
            opponentScore: outcome.opponentScore,
            highBreak: outcome.playerHighBreak,
            scoreEvents: state.events,
          })
        }
        type="button"
      >
        {saving ? t('saving') : t('scorer.save')}
      </button>
    </div>
  );
}

const actionBtn =
  'press inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-40';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-current px-1 text-[10px] font-medium opacity-60">{children}</kbd>
  );
}
