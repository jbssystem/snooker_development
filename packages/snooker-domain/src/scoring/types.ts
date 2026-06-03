// Pure snooker scoring domain — no React, no canvas, no rendering library.
// Encodes the rules of frame scoring so the UI only dispatches actions and
// renders derived state. Consumed by apps/web (live scorer) and apps/api
// (server-side recomputation from the persisted event log).

import type { BallColor } from '../table/types';

// Every ball that carries a point value (the cue ball "white" never does).
export type ScoringBall = Exclude<BallColor, 'white'>;

export const BALL_VALUES: Record<ScoringBall, number> = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
};

// Order colours must be cleared in once all reds are gone.
export const COLOR_CLEARANCE_ORDER: ScoringBall[] = [
  'yellow',
  'green',
  'brown',
  'blue',
  'pink',
  'black',
];

export const STANDARD_REDS = 15;

// Minimum penalty for any foul; the actual penalty is max(4, ball value involved).
export const MIN_FOUL_VALUE = 4;

export type FrameSide = 'player' | 'opponent';

// What the striker is expected to hit next, per the rules.
//  - 'red'           : a red must be potted (reds still on the table)
//  - 'color'         : a free-choice colour after a red was potted
//  - 'sequenceColor' : the lowest remaining colour (final clearance)
export type Expecting = 'red' | 'color' | 'sequenceColor';

export type FramePhase = 'reds' | 'colors';

// The persisted, replayable event log. Each event is enough to rebuild the
// whole frame state deterministically via `replay`.
export type ScoreEvent =
  | { seq: number; type: 'pot'; player: FrameSide; ball: ScoringBall; points: number; freeBall?: boolean }
  | { seq: number; type: 'foul'; player: FrameSide; value: number } // player = offender
  | { seq: number; type: 'endTurn'; player: FrameSide; kind: 'safety' | 'miss' | 'switch' };

export interface FrameScoreState {
  scores: Record<FrameSide, number>;
  highBreaks: Record<FrameSide, number>;
  currentPlayer: FrameSide;
  currentBreak: number;
  redsRemaining: number;
  phase: FramePhase;
  colorsRemaining: ScoringBall[];
  expecting: Expecting;
  finished: boolean;
  events: ScoreEvent[];
}

// One uninterrupted run of pots by a single player (a "break"), in order.
export interface BreakRun {
  side: FrameSide;
  balls: ScoringBall[];
  points: number;
}

export interface FrameOutcome {
  playerScore: number;
  opponentScore: number;
  playerHighBreak: number;
  opponentHighBreak: number;
  winner: FrameSide | 'unknown';
}
