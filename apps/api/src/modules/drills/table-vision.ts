import {
  BALL_DIAMETER_MM,
  TABLE_DIMENSIONS_MM,
  type BallColor,
  type BallPosition,
  type TableLayout,
  type TableSize,
} from '@snooker/snooker-domain';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 90_000;
const BALL_COLORS: BallColor[] = ['white', 'red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];

type BaulkSide = 'left' | 'right' | 'top' | 'bottom';
type RecognizedBall = { color: BallColor; x: number; y: number };
type RecognizedTable = { baulkSide: BaulkSide; balls: RecognizedBall[] };

const SYSTEM_PROMPT =
  'You are a computer-vision assistant for snooker coaching. ' +
  'You receive a single photo of a snooker table with balls on it, usually taken at an angle. ' +
  'Report where each ball appears in the photo and which side the baulk (D) end is on. ' +
  'Pay special attention to tightly packed groups of reds: resolve each ball individually and KEEP THEM CLUSTERED — never scatter a tight pack across the table. ' +
  'Reply with STRICT JSON only — no prose, no markdown fences.';

const USER_PROMPT = [
  'Return a JSON object of the form:',
  '{"baulkSide":"left","balls":[{"color":"red","x":0.0,"y":0.0}, ...]}',
  '',
  'Use IMAGE coordinates — simply where each ball appears in the photo:',
  '- x = 0 at the LEFT edge of the playing area, 1 at the RIGHT edge.',
  '- y = 0 at the TOP edge of the playing area, 1 at the BOTTOM edge.',
  '- Fractions of the playing surface inside the cushions. Correct for perspective if the photo is angled.',
  '',
  'baulkSide = which side of the photo the BAULK end is on: the end with the curved "D" line and the baulk colours (yellow, green, brown). One of "left", "right", "top", "bottom".',
  '',
  'Scale reference — space balls correctly:',
  '- One ball is about 1/24 of the table\'s LONG side. Balls that touch are about that far apart, centre to centre, and can NEVER be closer than that or overlap.',
  '',
  'Reds (most common mistake — read carefully):',
  '- Reds usually sit in a TIGHT triangular pack. Keep the pack tight: neighbouring reds almost touching.',
  '- DO NOT spread the reds across the table. Give the centre of every red you can see and count them (up to 15).',
  '',
  'Snooker layout hints (only for balls actually present):',
  '- yellow, green, brown sit in a row on the baulk line; blue is the centre spot; pink sits just in front of the red pack; black is behind the pack near the far cushion.',
  '',
  'Other rules:',
  `- color is one of: ${BALL_COLORS.join(', ')}.`,
  '- At most one white (cue) ball. Each colour (yellow/green/brown/blue/pink/black) appears at most once.',
  '- Only include balls actually visible on the table. Do not invent balls.',
  '- Output JSON only — no prose, no markdown fences.',
].join('\n');

/**
 * Ask Claude Vision to read ball positions off a photo and convert the
 * normalised result into a domain TableLayout (millimetres). Throws on transport
 * or parsing failure so the caller can surface a clean error code.
 */
export async function recognizeTableLayout(params: {
  apiKey: string;
  model: string;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  tableSize: TableSize;
}): Promise<TableLayout> {
  const recognized = await callAnthropicVision(params);
  return buildLayout(recognized, params.tableSize);
}

async function callAnthropicVision(params: {
  apiKey: string;
  model: string;
  base64: string;
  mediaType: string;
}): Promise<RecognizedTable> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: params.mediaType, data: stripDataUrl(params.base64) },
            },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    }),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
  const body = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = body.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response did not contain text');
  return parseTable(text);
}

function parseTable(text: string): RecognizedTable {
  const json = extractJson(text);
  const parsed = JSON.parse(json) as { baulkSide?: unknown; balls?: unknown };
  const raw = Array.isArray(parsed.balls) ? parsed.balls : [];
  const balls: RecognizedBall[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { color, x, y } = entry as Record<string, unknown>;
    if (!isBallColor(color) || typeof x !== 'number' || typeof y !== 'number') continue;
    balls.push({ color, x, y });
  }
  return { baulkSide: toBaulkSide(parsed.baulkSide), balls };
}

function toBaulkSide(value: unknown): BaulkSide {
  return value === 'right' || value === 'top' || value === 'bottom' ? value : 'left';
}

// The model is asked for bare JSON but may still wrap it in ``` fences or stray
// prose; grab the first balanced object so a chatty reply still parses.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('No JSON object in vision response');
  return candidate.slice(start, end + 1);
}

function buildLayout(recognized: RecognizedTable, tableSize: TableSize): TableLayout {
  const dimensions = tableSize === 'club' ? TABLE_DIMENSIONS_MM.club : TABLE_DIMENSIONS_MM.fullSize;
  const radius = BALL_DIAMETER_MM / 2;
  let redCount = 0;
  const seenColours = new Set<BallColor>();
  const positioned: BallPosition[] = [];

  for (const ball of recognized.balls) {
    if (positioned.length >= 32) break;
    let id: string;
    if (ball.color === 'red') {
      redCount += 1;
      if (redCount > 15) continue;
      id = `red-${redCount}`;
    } else {
      if (seenColours.has(ball.color)) continue;
      seenColours.add(ball.color);
      id = ball.color;
    }
    // Map image coords → domain so the baulk (D) end always lands at low x,
    // where the canvas draws the D. Without this, a photo shot from the baulk
    // side comes out mirrored.
    const { fx, fy } = toDomainFractions(ball.x, ball.y, recognized.baulkSide);
    positioned.push({
      id,
      color: ball.color,
      x: clamp(fx * dimensions.width, radius, dimensions.width - radius),
      y: clamp(fy * dimensions.height, radius, dimensions.height - radius),
      visible: true,
    });
  }

  separateOverlaps(positioned, dimensions, radius);

  return {
    id: `layout-${Date.now()}`,
    tableSize,
    balls: positioned,
    targetZones: [],
    shotPaths: [],
    annotations: [],
  };
}

// Vision estimates of clustered balls often land slightly on top of each other.
// Nudge any overlapping pair apart to at least one ball-diameter so the editor
// shows a clean pack instead of stacked discs. A few relaxation passes converge
// for the <=32 balls we ever have; positions stay clamped inside the cushions.
function separateOverlaps(
  balls: BallPosition[],
  dimensions: { width: number; height: number },
  radius: number,
): void {
  const minDist = BALL_DIAMETER_MM;
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < balls.length; i += 1) {
      for (let j = i + 1; j < balls.length; j += 1) {
        const a = balls[i]!;
        const b = balls[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) continue;
        if (dist < 1e-6) {
          // Exactly coincident: pick a deterministic direction to break the tie.
          dx = Math.cos(i + j);
          dy = Math.sin(i + j);
          dist = 1;
        }
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x = clamp(a.x - ux * push, radius, dimensions.width - radius);
        a.y = clamp(a.y - uy * push, radius, dimensions.height - radius);
        b.x = clamp(b.x + ux * push, radius, dimensions.width - radius);
        b.y = clamp(b.y + uy * push, radius, dimensions.height - radius);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

// Convert image-relative fractions (x: left→right, y: top→bottom) to domain
// fractions where fx runs along the LONG axis from the baulk end (0). For
// portrait photos (baulk top/bottom) the long axis is vertical, so the image
// axes are swapped.
function toDomainFractions(x: number, y: number, baulkSide: BaulkSide): { fx: number; fy: number } {
  switch (baulkSide) {
    case 'right':
      return { fx: 1 - x, fy: y };
    case 'top':
      return { fx: y, fy: x };
    case 'bottom':
      return { fx: 1 - y, fy: x };
    case 'left':
    default:
      return { fx: x, fy: y };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isBallColor(value: unknown): value is BallColor {
  return typeof value === 'string' && (BALL_COLORS as string[]).includes(value);
}

function stripDataUrl(base64: string): string {
  const marker = 'base64,';
  const index = base64.indexOf(marker);
  return index === -1 ? base64 : base64.slice(index + marker.length);
}
