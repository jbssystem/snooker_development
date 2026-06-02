import {
  BALL_DIAMETER_MM,
  SPOTS_MM,
  TABLE_DIMENSIONS_MM,
  type BallColor,
  type BallPosition,
  type Point,
  type TableLayout,
} from '@snooker/snooker-domain';

export function createEmptyTableLayout(id = `layout-${Date.now()}`): TableLayout {
  return {
    id,
    tableSize: 'full-size',
    balls: [],
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

export function createStandardTableLayout(id = `layout-${Date.now()}`): TableLayout {
  const reds = createRedPack();
  return {
    id,
    tableSize: 'full-size',
    balls: [
      ball('white', 'white', { x: SPOTS_MM.brown.x - 250, y: SPOTS_MM.brown.y + 310 }),
      ball('yellow', 'yellow', SPOTS_MM.yellow),
      ball('green', 'green', SPOTS_MM.green),
      ball('brown', 'brown', SPOTS_MM.brown),
      ball('blue', 'blue', SPOTS_MM.blue),
      ball('pink', 'pink', SPOTS_MM.pink),
      ball('black', 'black', SPOTS_MM.black),
      ...reds,
    ],
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

export const DRILL_LAYOUT_PRESETS = ['empty', 'standard', 'colours', 'longPot', 'lineUp'] as const;
export type DrillLayoutPreset = (typeof DRILL_LAYOUT_PRESETS)[number];

const CUE_IN_D: Point = { x: SPOTS_MM.brown.x - 250, y: SPOTS_MM.brown.y + 310 };

function colourBalls(): BallPosition[] {
  return [
    ball('yellow', 'yellow', SPOTS_MM.yellow),
    ball('green', 'green', SPOTS_MM.green),
    ball('brown', 'brown', SPOTS_MM.brown),
    ball('blue', 'blue', SPOTS_MM.blue),
    ball('pink', 'pink', SPOTS_MM.pink),
    ball('black', 'black', SPOTS_MM.black),
  ];
}

/** Cue ball plus the six colours on their spots (colour-clearance practice). */
export function createColoursLayout(id = `layout-${Date.now()}`): TableLayout {
  return {
    id,
    tableSize: 'full-size',
    balls: [ball('white', 'white', CUE_IN_D), ...colourBalls()],
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

/** Cue ball in the D plus a single red near the black spot (long potting). */
export function createLongPotLayout(id = `layout-${Date.now()}`): TableLayout {
  return {
    id,
    tableSize: 'full-size',
    balls: [
      ball('white', 'white', CUE_IN_D),
      ball('red-1', 'red', { x: SPOTS_MM.black.x, y: SPOTS_MM.black.y }),
    ],
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

/** Colours on spots plus a line of reds down the spine (the "Line Up" routine). */
export function createLineUpLayout(id = `layout-${Date.now()}`): TableLayout {
  return {
    id,
    tableSize: 'full-size',
    balls: [ball('white', 'white', CUE_IN_D), ...colourBalls(), ...buildRedLine(11)],
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

export function createPresetLayout(preset: DrillLayoutPreset, id = `layout-${Date.now()}`): TableLayout {
  switch (preset) {
    case 'empty':
      return { ...createEmptyTableLayout(id), balls: [ball('white', 'white', CUE_IN_D)] };
    case 'standard':
      return createStandardTableLayout(id);
    case 'colours':
      return createColoursLayout(id);
    case 'longPot':
      return createLongPotLayout(id);
    case 'lineUp':
      return createLineUpLayout(id);
  }
}

export const MAX_REDS = 15;

export function redCount(layout: TableLayout): number {
  return layout.balls.filter((b) => b.color === 'red').length;
}

/**
 * Return a copy of the layout with exactly `count` reds (0..15) arranged as a
 * standard triangle from the apex. Non-red balls, zones, paths and annotations
 * are preserved, so a coach can dial the number of reds for any drill.
 */
export function withReds(layout: TableLayout, count: number): TableLayout {
  const clamped = Math.max(0, Math.min(MAX_REDS, Math.round(count)));
  const nonReds = layout.balls.filter((b) => b.color !== 'red');
  return { ...layout, balls: [...nonReds, ...buildRedTriangle(clamped)] };
}

function buildRedTriangle(count: number): BallPosition[] {
  const balls: BallPosition[] = [];
  const spacing = BALL_DIAMETER_MM + 4;
  const apex = { x: SPOTS_MM.pink.x + 92, y: SPOTS_MM.pink.y };
  let id = 1;
  for (let row = 0; row < 5 && id <= count; row += 1) {
    const x = apex.x + row * spacing * 0.9;
    const firstY = apex.y - (row * spacing) / 2;
    for (let index = 0; index <= row && id <= count; index += 1) {
      balls.push(ball(`red-${id}`, 'red', { x, y: firstY + index * spacing }));
      id += 1;
    }
  }
  return balls;
}

function buildRedLine(count: number): BallPosition[] {
  const balls: BallPosition[] = [];
  const startX = SPOTS_MM.blue.x;
  const endX = SPOTS_MM.pink.x + 92;
  const step = count > 1 ? (endX - startX) / (count - 1) : 0;
  for (let index = 0; index < count; index += 1) {
    balls.push(ball(`red-${index + 1}`, 'red', { x: startX + step * index, y: SPOTS_MM.blue.y }));
  }
  return balls;
}

export function tableDimensions(layout: Pick<TableLayout, 'tableSize'>) {
  if (layout.tableSize === 'club') return TABLE_DIMENSIONS_MM.club;
  return TABLE_DIMENSIONS_MM.fullSize;
}

export function defaultBallPoint(color: BallColor, layout: TableLayout): Point {
  const dimensions = tableDimensions(layout);
  if (color === 'yellow') return scaleSpot(SPOTS_MM.yellow, dimensions.width);
  if (color === 'green') return scaleSpot(SPOTS_MM.green, dimensions.width);
  if (color === 'brown') return scaleSpot(SPOTS_MM.brown, dimensions.width);
  if (color === 'blue') return scaleSpot(SPOTS_MM.blue, dimensions.width);
  if (color === 'pink') return scaleSpot(SPOTS_MM.pink, dimensions.width);
  if (color === 'black') return scaleSpot(SPOTS_MM.black, dimensions.width);
  if (color === 'white') return { x: dimensions.width * 0.16, y: dimensions.height * 0.68 };
  return { x: dimensions.width * 0.76, y: dimensions.height / 2 };
}

function ball(id: string, color: BallColor, point: Point): BallPosition {
  return { id, color, x: point.x, y: point.y, visible: true };
}

function createRedPack(): BallPosition[] {
  const balls: BallPosition[] = [];
  const spacing = BALL_DIAMETER_MM + 4;
  const apex = { x: SPOTS_MM.pink.x + 92, y: SPOTS_MM.pink.y };
  let id = 1;
  for (let row = 0; row < 5; row += 1) {
    const x = apex.x + row * spacing * 0.9;
    const firstY = apex.y - (row * spacing) / 2;
    for (let index = 0; index <= row; index += 1) {
      balls.push(ball(`red-${id}`, 'red', { x, y: firstY + index * spacing }));
      id += 1;
    }
  }
  return balls;
}

function scaleSpot(point: Point, width: number): Point {
  const scale = width / TABLE_DIMENSIONS_MM.fullSize.width;
  return { x: point.x * scale, y: point.y * scale };
}
