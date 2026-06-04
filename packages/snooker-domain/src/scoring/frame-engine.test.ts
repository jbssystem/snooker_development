import { describe, expect, it } from 'vitest';

import {
  applyFoul,
  applyFreeBall,
  applyMiss,
  applyPot,
  applySafety,
  ballOn,
  ballSequenceFor,
  breakRunsFor,
  createFrame,
  frameOutcome,
  frameTimelineFor,
  replay,
  undo,
} from './frame-engine';
import type { FrameScoreState, ScoringBall } from './types';

// Helper: pot a sequence of balls in one visit.
function potMany(state: FrameScoreState, balls: ScoringBall[]): FrameScoreState {
  return balls.reduce((acc, ball) => applyPot(acc, ball), state);
}

describe('createFrame', () => {
  it('starts a standard 15-red frame expecting a red', () => {
    const state = createFrame();
    expect(state.redsRemaining).toBe(15);
    expect(state.expecting).toBe('red');
    expect(state.scores).toEqual({ player: 0, opponent: 0 });
  });
});

describe('reds phase', () => {
  it('alternates red then colour and keeps reds count', () => {
    let state = createFrame();
    state = applyPot(state, 'red');
    expect(state.scores.player).toBe(1);
    expect(state.redsRemaining).toBe(14);
    expect(ballOn(state)).toEqual(['yellow', 'green', 'brown', 'blue', 'pink', 'black']);

    state = applyPot(state, 'black');
    expect(state.scores.player).toBe(8); // 1 + 7
    expect(state.currentBreak).toBe(8);
    expect(ballOn(state)).toEqual(['red']); // colour re-spotted, back to reds
  });
});

describe('high breaks', () => {
  it('records a 147 maximum break', () => {
    let state = createFrame();
    for (let i = 0; i < 15; i += 1) {
      state = applyPot(state, 'red');
      state = applyPot(state, 'black');
    }
    // All reds gone; clear the colours in order.
    state = potMany(state, ['yellow', 'green', 'brown', 'blue', 'pink', 'black']);
    expect(state.scores.player).toBe(147);
    expect(state.highBreaks.player).toBe(147);
    expect(state.finished).toBe(true);
  });
});

describe('clearance phase', () => {
  it('enforces ascending colour order after the last red', () => {
    let state = createFrame(1);
    state = applyPot(state, 'red'); // 1
    state = applyPot(state, 'blue'); // free colour after last red: 5
    expect(state.phase).toBe('colors');
    expect(ballOn(state)).toEqual(['yellow']);
    state = potMany(state, ['yellow', 'green', 'brown', 'blue', 'pink', 'black']);
    expect(state.finished).toBe(true);
    expect(state.scores.player).toBe(1 + 5 + 2 + 3 + 4 + 5 + 6 + 7);
  });
});

describe('fouls', () => {
  it('applies a minimum 4-point penalty to the opponent and switches turn', () => {
    let state = createFrame();
    state = applyFoul(state, 1); // potting white off a red → min 4
    expect(state.scores.opponent).toBe(4);
    expect(state.currentPlayer).toBe('opponent');
  });

  it('uses the ball value when it exceeds the minimum (foul on black = 7)', () => {
    let state = createFrame();
    state = applyFoul(state, 7);
    expect(state.scores.opponent).toBe(7);
  });

  it('ends the offender break', () => {
    let state = createFrame();
    state = applyPot(state, 'red');
    state = applyPot(state, 'black'); // break of 8
    expect(state.currentBreak).toBe(8);
    state = applyFoul(state, 4);
    expect(state.highBreaks.player).toBe(8);
    expect(state.currentBreak).toBe(0);
  });
});

describe('free ball', () => {
  it('scores one point as a red stand-in during the reds phase', () => {
    let state = createFrame();
    state = applyFreeBall(state);
    expect(state.scores.player).toBe(1);
    expect(state.redsRemaining).toBe(15); // not a real red
    expect(state.expecting).toBe('color');
  });
});

describe('turn changes', () => {
  it('passes the table on safety and miss without points', () => {
    let state = createFrame();
    state = applySafety(state);
    expect(state.currentPlayer).toBe('opponent');
    state = applyMiss(state);
    expect(state.currentPlayer).toBe('player');
    expect(state.scores).toEqual({ player: 0, opponent: 0 });
  });
});

describe('undo and replay', () => {
  it('undo is replay of all but the last event', () => {
    let state = createFrame();
    state = applyPot(state, 'red');
    state = applyPot(state, 'black');
    const undone = undo(state);
    expect(undone.scores.player).toBe(1);
    expect(undone.redsRemaining).toBe(14);
    expect(undone.events).toHaveLength(1);
  });

  it('replay reconstructs identical state from the event log', () => {
    let state = createFrame();
    state = applyPot(state, 'red');
    state = applyPot(state, 'black');
    state = applyFoul(state, 4);
    state = applyPot(state, 'red');
    const rebuilt = replay(state.events);
    expect(rebuilt.scores).toEqual(state.scores);
    expect(rebuilt.highBreaks).toEqual(state.highBreaks);
    expect(rebuilt.redsRemaining).toBe(state.redsRemaining);
    expect(rebuilt.currentPlayer).toBe(state.currentPlayer);
    expect(rebuilt.expecting).toBe(state.expecting);
  });
});

describe('visual map helpers', () => {
  it('groups pots into break runs per side', () => {
    let state = createFrame();
    state = potMany(state, ['red', 'black', 'red', 'pink']); // player break of 4 pots
    state = applySafety(state);
    state = applyPot(state, 'red'); // opponent
    expect(ballSequenceFor(state, 'player')).toEqual(['red', 'black', 'red', 'pink']);
    const playerRuns = breakRunsFor(state, 'player');
    expect(playerRuns).toHaveLength(1);
    expect(playerRuns[0]!.points).toBe(1 + 7 + 1 + 6);
    expect(breakRunsFor(state, 'opponent')).toHaveLength(1);
  });

  it('builds a per-side timeline interleaving breaks, fouls and turn-ends', () => {
    let state = createFrame();
    state = potMany(state, ['red', 'black']); // player break of 8
    state = applySafety(state); // player ends the visit with a safety
    state = applyFoul(state, 5); // opponent fouls (5 to player)
    state = applyPot(state, 'red'); // player pots again
    state = applySafety(state); // player ends visit

    const playerTimeline = frameTimelineFor(state, 'player');
    expect(playerTimeline).toEqual([
      { kind: 'break', balls: ['red', 'black'], points: 8 },
      { kind: 'endTurn', reason: 'safety' },
      { kind: 'break', balls: ['red'], points: 1 },
      { kind: 'endTurn', reason: 'safety' },
    ]);

    // The opponent's only action this frame was the foul they conceded.
    expect(frameTimelineFor(state, 'opponent')).toEqual([{ kind: 'foul', value: 5 }]);
  });
});

describe('frameOutcome', () => {
  it('derives winner and high breaks', () => {
    let state = createFrame(1);
    state = applyPot(state, 'red');
    state = applyPot(state, 'black');
    state = applySafety(state);
    state = applyPot(state, 'yellow');
    const outcome = frameOutcome(state);
    expect(outcome.playerScore).toBe(8);
    expect(outcome.opponentScore).toBe(2);
    expect(outcome.winner).toBe('player');
    expect(outcome.playerHighBreak).toBe(8);
  });
});
