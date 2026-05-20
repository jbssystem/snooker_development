// Full-size English snooker table interior playing surface: 11ft 8.5in x 5ft 10in.
// We use millimetres for math; renderers scale to pixels.

export const TABLE_DIMENSIONS_MM = {
  fullSize: { width: 3569, height: 1778 },
  club: { width: 2540, height: 1270 },
} as const;

export const BALL_DIAMETER_MM = 52.5;

export const POCKET_RADIUS_MM = {
  corner: 43,
  middle: 47,
} as const;

export const SPOTS_MM = {
  // Measured from baulk cushion / centre line on a full-size table.
  yellow: { x: 736.6, y: 305 },
  green: { x: 736.6, y: 1473 },
  brown: { x: 736.6, y: 889 },
  blue: { x: 1784.5, y: 889 },
  pink: { x: 2603, y: 889 },
  black: { x: 3245, y: 889 },
} as const;
