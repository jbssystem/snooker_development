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

type RecognizedBall = { color: BallColor; x: number; y: number };

const SYSTEM_PROMPT =
  'You are a computer-vision assistant for snooker coaching. ' +
  'You receive a single photo of a snooker table with balls on it, usually taken at an angle. ' +
  'Identify every ball you can see on the playing surface and estimate its position, mentally correcting for perspective. ' +
  'Pay special attention to tightly packed groups of reds: resolve each ball individually and KEEP THEM CLUSTERED — never scatter a tight pack across the table. ' +
  'Reply with STRICT JSON only — no prose, no markdown fences.';

const USER_PROMPT = [
  'Return a JSON object of the form:',
  '{"balls":[{"color":"red","x":0.0,"y":0.0}, ...]}',
  '',
  'Coordinate system (fractions of the playing surface between the cushions, each 0..1):',
  '- x = position along the LONG axis: 0 = baulk cushion (cue-ball / D end), 1 = the far black-spot cushion.',
  '- y = position across the SHORT axis: 0 = one long cushion, 1 = the opposite long cushion.',
  '',
  'Scale reference — use this to space balls correctly:',
  '- One ball is about 0.015 wide along x and about 0.030 wide along y.',
  '- Two balls that touch have centres about 0.015 apart along x (or 0.030 along y). Balls can NEVER be closer than that and can never overlap.',
  '',
  'Reds (most common mistake — read carefully):',
  '- Reds are very often bunched in a TIGHT cluster: a triangular pack or a short line, usually in the middle-to-far half of the table (around x 0.6–0.95).',
  '- When the reds are bunched together in the photo, KEEP THEM BUNCHED in the output: neighbouring reds sit right next to each other, centres only ~0.015–0.03 apart. DO NOT spread a tight group of reds across the whole table.',
  '- Estimate the centre of every individual red you can see, even when they are touching. Count them carefully (up to 15).',
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
  const balls = await callAnthropicVision(params);
  return buildLayout(balls, params.tableSize);
}

async function callAnthropicVision(params: {
  apiKey: string;
  model: string;
  base64: string;
  mediaType: string;
}): Promise<RecognizedBall[]> {
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
  return parseBalls(text);
}

function parseBalls(text: string): RecognizedBall[] {
  const json = extractJson(text);
  const parsed = JSON.parse(json) as { balls?: unknown };
  const raw = Array.isArray(parsed.balls) ? parsed.balls : [];
  const balls: RecognizedBall[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { color, x, y } = entry as Record<string, unknown>;
    if (!isBallColor(color) || typeof x !== 'number' || typeof y !== 'number') continue;
    balls.push({ color, x, y });
  }
  return balls;
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

function buildLayout(balls: RecognizedBall[], tableSize: TableSize): TableLayout {
  const dimensions = tableSize === 'club' ? TABLE_DIMENSIONS_MM.club : TABLE_DIMENSIONS_MM.fullSize;
  const radius = BALL_DIAMETER_MM / 2;
  let redCount = 0;
  const seenColours = new Set<BallColor>();
  const positioned: BallPosition[] = [];

  for (const ball of balls) {
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
    positioned.push({
      id,
      color: ball.color,
      x: clamp(ball.x * dimensions.width, radius, dimensions.width - radius),
      y: clamp(ball.y * dimensions.height, radius, dimensions.height - radius),
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
