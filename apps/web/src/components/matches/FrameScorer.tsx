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
              className={`rounded-lg border p-3 transition ${
                atTable ? 'border-brand-accent bg-background-elevated' : 'border-border-subtle bg-background-primary'
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

      {/* Ball palette */}
      <div className="flex flex-wrap gap-2">
        {ALL_BALLS.map((ball) => {
          const enabled = allowed.has(ball) && !state.finished;
          return (
            <button
              key={ball}
              className="flex h-12 w-12 items-center justify-center rounded-full font-semibold text-white shadow ring-1 ring-black/30 transition disabled:cursor-not-allowed disabled:opacity-25"
              disabled={!enabled}
              onClick={() => dispatch({ kind: 'pot', ball })}
              style={{ backgroundColor: BALL_HEX[ball] }}
              title={t(`scorer.balls.${ball}`)}
              type="button"
            />
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
          {t('scorer.safety')}
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-accent bg-brand-accent/15 px-3 py-1.5 font-semibold text-brand-accent transition hover:bg-brand-accent/25 disabled:opacity-40"
          disabled={state.finished}
          onClick={() => dispatch({ kind: 'switch' })}
          type="button"
        >
          {t('scorer.endTurn')} →
        </button>
        <button className={actionBtn} disabled={!hasEvents} onClick={() => dispatch({ kind: 'undo' })} type="button">
          {t('scorer.undo')}
        </button>
        <button className={actionBtn} disabled={!hasEvents} onClick={() => dispatch({ kind: 'reset' })} type="button">
          {t('scorer.rerack')}
        </button>
      </div>

      {/* Per-player ball-sequence map */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map(({ side, name }) => (
          <div key={side} className="rounded-lg border border-border-subtle bg-background-primary p-3">
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
  'rounded-md border border-border-subtle px-2.5 py-1.5 font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-40';
