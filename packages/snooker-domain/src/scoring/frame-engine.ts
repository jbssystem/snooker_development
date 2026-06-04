// Pure, immutable frame-scoring engine. Every action returns a new state;
// `undo` and `replay` rebuild state by folding the event log, so the log is
// the single source of truth.

import {
  BALL_VALUES,
  COLOR_CLEARANCE_ORDER,
  MIN_FOUL_VALUE,
  STANDARD_REDS,
  type BreakRun,
  type Expecting,
  type FrameOutcome,
  type FrameScoreState,
  type FrameSide,
  type FrameTimelineItem,
  type ScoreEvent,
  type ScoringBall,
} from './types';

function otherSide(side: FrameSide): FrameSide {
  return side === 'player' ? 'opponent' : 'player';
}

export function createFrame(reds: number = STANDARD_REDS): FrameScoreState {
  return {
    scores: { player: 0, opponent: 0 },
    highBreaks: { player: 0, opponent: 0 },
    currentPlayer: 'player',
    currentBreak: 0,
    redsRemaining: Math.max(0, Math.trunc(reds)),
    phase: 'reds',
    colorsRemaining: [...COLOR_CLEARANCE_ORDER],
    expecting: reds > 0 ? 'red' : 'sequenceColor',
    finished: false,
    events: [],
  };
}

// The ball(s) the striker may legally pot next. Used by the UI to enable buttons.
export function ballOn(state: FrameScoreState): ScoringBall[] {
  if (state.finished) return [];
  if (state.expecting === 'red') return ['red'];
  if (state.expecting === 'color') return ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  return state.colorsRemaining.length > 0 ? [state.colorsRemaining[0]!] : [];
}

// Reset what the striker is expected to hit at the start of a fresh visit.
function expectingAfterTurnChange(state: FrameScoreState): Expecting {
  if (state.phase === 'colors') return 'sequenceColor';
  return state.redsRemaining > 0 ? 'red' : 'sequenceColor';
}

function finalizeBreak(state: FrameScoreState): void {
  const side = state.currentPlayer;
  state.highBreaks[side] = Math.max(state.highBreaks[side], state.currentBreak);
  state.currentBreak = 0;
}

// Advance phase/expectation after a successful pot (drives the rules machine).
function advanceAfterPot(state: FrameScoreState, freeBall: boolean): void {
  if (state.phase === 'colors') {
    // Final clearance: lowest colour first. A free ball here is re-spotted,
    // so the colour stays "on" and the expectation is unchanged.
    if (!freeBall) {
      state.colorsRemaining.shift();
      if (state.colorsRemaining.length === 0) {
        state.finished = true;
      }
    }
    state.expecting = 'sequenceColor';
    return;
  }

  // Reds phase.
  if (state.expecting === 'red') {
    // A free ball stands in for a red but is not a real red, so the count holds.
    if (!freeBall) state.redsRemaining -= 1;
    state.expecting = 'color';
    return;
  }

  // expecting === 'color' — a colour was potted (re-spotted while reds remain).
  if (state.redsRemaining > 0) {
    state.expecting = 'red';
  } else {
    // That was the free colour after the final red → start the clearance.
    state.phase = 'colors';
    state.colorsRemaining = [...COLOR_CLEARANCE_ORDER];
    state.expecting = 'sequenceColor';
  }
}

function nextSeq(state: FrameScoreState): number {
  return state.events.length === 0 ? 1 : state.events[state.events.length - 1]!.seq + 1;
}

export function applyPot(state: FrameScoreState, ball: ScoringBall): FrameScoreState {
  if (state.finished) return state;
  const next = cloneForMutation(state);
  const side = next.currentPlayer;
  const points = BALL_VALUES[ball];

  next.scores[side] += points;
  next.currentBreak += points;
  next.highBreaks[side] = Math.max(next.highBreaks[side], next.currentBreak);
  next.events.push({ seq: nextSeq(next), type: 'pot', player: side, ball, points });
  advanceAfterPot(next, false);
  return next;
}

// A free ball after a foul: scores the value of the ball "on". In the reds
// phase it stands in for a red (1 pt) and the striker then plays a colour; in
// the clearance phase it scores the lowest remaining colour, which stays on.
export function applyFreeBall(state: FrameScoreState): FrameScoreState {
  if (state.finished) return state;
  const on = ballOn(state);
  if (on.length === 0) return state;
  const next = cloneForMutation(state);
  const side = next.currentPlayer;
  const nominal: ScoringBall = next.expecting === 'red' ? 'red' : on[0]!;
  const points = next.expecting === 'red' ? BALL_VALUES.red : BALL_VALUES[nominal];

  next.scores[side] += points;
  next.currentBreak += points;
  next.highBreaks[side] = Math.max(next.highBreaks[side], next.currentBreak);
  next.events.push({ seq: nextSeq(next), type: 'pot', player: side, ball: nominal, points, freeBall: true });
  advanceAfterPot(next, true);
  return next;
}

export function applyFoul(state: FrameScoreState, value: number): FrameScoreState {
  if (state.finished) return state;
  const next = cloneForMutation(state);
  const offender = next.currentPlayer;
  const penalty = Math.max(MIN_FOUL_VALUE, Math.trunc(value));

  next.scores[otherSide(offender)] += penalty;
  next.events.push({ seq: nextSeq(next), type: 'foul', player: offender, value: penalty });
  finalizeBreak(next);
  next.currentPlayer = otherSide(offender);
  next.expecting = expectingAfterTurnChange(next);
  return next;
}

function endTurn(state: FrameScoreState, kind: 'safety' | 'miss' | 'switch'): FrameScoreState {
  if (state.finished) return state;
  const next = cloneForMutation(state);
  const side = next.currentPlayer;
  next.events.push({ seq: nextSeq(next), type: 'endTurn', player: side, kind });
  finalizeBreak(next);
  next.currentPlayer = otherSide(side);
  next.expecting = expectingAfterTurnChange(next);
  return next;
}

export function applySafety(state: FrameScoreState): FrameScoreState {
  return endTurn(state, 'safety');
}

export function applyMiss(state: FrameScoreState): FrameScoreState {
  return endTurn(state, 'miss');
}

export function switchPlayer(state: FrameScoreState): FrameScoreState {
  return endTurn(state, 'switch');
}

// Rebuild state from an event log (used to restore a saved frame and to
// recompute totals server-side as a guard against client/server drift).
export function replay(events: ScoreEvent[], reds: number = STANDARD_REDS): FrameScoreState {
  let state = createFrame(reds);
  for (const event of events) {
    switch (event.type) {
      case 'pot':
        state = event.freeBall ? applyFreeBall(state) : applyPot(state, event.ball);
        break;
      case 'foul':
        state = applyFoul(state, event.value);
        break;
      case 'endTurn':
        state = endTurn(state, event.kind);
        break;
    }
  }
  return state;
}

export function undo(state: FrameScoreState): FrameScoreState {
  if (state.events.length === 0) return state;
  return replay(state.events.slice(0, -1), initialRedsFrom(state));
}

// Reds the frame started with: current reds plus reds already potted.
function initialRedsFrom(state: FrameScoreState): number {
  const redsPotted = state.events.filter(
    (event) => event.type === 'pot' && event.ball === 'red' && !event.freeBall,
  ).length;
  return state.redsRemaining + redsPotted;
}

// Flat list of balls a side potted, in order (for a compact sequence map).
export function ballSequenceFor(state: FrameScoreState, side: FrameSide): ScoringBall[] {
  return state.events
    .filter((event): event is Extract<ScoreEvent, { type: 'pot' }> => event.type === 'pot' && event.player === side)
    .map((event) => event.ball);
}

// Pots grouped into the visits (breaks) they belong to — drives the visual map.
export function breakRunsFor(state: FrameScoreState, side: FrameSide): BreakRun[] {
  const runs: BreakRun[] = [];
  let open: BreakRun | null = null;
  for (const event of state.events) {
    if (event.type === 'pot') {
      if (!open || open.side !== event.player) {
        open = { side: event.player, balls: [], points: 0 };
        runs.push(open);
      }
      open.balls.push(event.ball);
      open.points += event.points;
    } else {
      // Any turn-ending event closes the current run.
      open = null;
    }
  }
  return runs.filter((run) => run.side === side);
}

// A side's full chronological timeline: their breaks plus the fouls they
// conceded and the turn-ending visits (safety/miss/switch). Unlike
// `breakRunsFor`, this keeps the non-scoring events so the UI can show the
// whole rhythm of a player's frame, not just the balls they potted.
export function frameTimelineFor(state: FrameScoreState, side: FrameSide): FrameTimelineItem[] {
  const items: FrameTimelineItem[] = [];
  let open: Extract<FrameTimelineItem, { kind: 'break' }> | null = null;
  for (const event of state.events) {
    if (event.type === 'pot' && event.player === side) {
      if (!open) {
        open = { kind: 'break', balls: [], points: 0 };
        items.push(open);
      }
      open.balls.push(event.ball);
      open.points += event.points;
      continue;
    }
    // Any other event (incl. the opponent acting) closes this side's open break.
    open = null;
    if (event.type === 'foul' && event.player === side) {
      items.push({ kind: 'foul', value: event.value });
    } else if (event.type === 'endTurn' && event.player === side) {
      items.push({ kind: 'endTurn', reason: event.kind });
    }
  }
  return items;
}

export function frameOutcome(state: FrameScoreState): FrameOutcome {
  const { player, opponent } = state.scores;
  let winner: FrameOutcome['winner'] = 'unknown';
  if (player > opponent) winner = 'player';
  else if (opponent > player) winner = 'opponent';
  return {
    playerScore: player,
    opponentScore: opponent,
    playerHighBreak: state.highBreaks.player,
    opponentHighBreak: state.highBreaks.opponent,
    winner,
  };
}

// Deep-ish clone so callers never mutate the input state.
function cloneForMutation(state: FrameScoreState): FrameScoreState {
  return {
    ...state,
    scores: { ...state.scores },
    highBreaks: { ...state.highBreaks },
    colorsRemaining: [...state.colorsRemaining],
    events: [...state.events],
  };
}
