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
