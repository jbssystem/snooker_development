import type { ExternalImportResult, ExternalSeasonStats } from '@snooker/shared';

const USER_AGENT = 'SnookerPlayerOS/1.0 (development tracker)';

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.text();
}

export function extractWstUuid(url: string): string | null {
  const match = url.match(/wst\.tv\/players\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

export async function parseWst(uuid: string): Promise<ExternalImportResult> {
  const url = `https://www.wst.tv/players/${uuid}`;
  const html = await fetchHtml(url);

  const playerName = extractPlayerName(html);
  const seasonStats = extractSeasonStats(html);

  return {
    matches: [],
    seasonStats,
    playerName,
  };
}

function extractPlayerName(html: string): string | null {
  const match = html.match(/class="[^"]*player[^"]*name[^"]*"[^>]*>([^<]+)/i);
  if (match?.[1]) return match[1].trim();

  const h1Match = html.match(/<h1[^>]*>([^<]+)/i);
  if (h1Match?.[1]) return h1Match[1].trim();

  const titleMatch = html.match(/<title>([^<|]+)/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const metaMatch = html.match(/og:title[^>]*content="([^"]+)"/i);
  if (metaMatch?.[1]) return metaMatch[1].trim();

  return null;
}

function extractSeasonStats(html: string): ExternalSeasonStats | null {
  const winsPattern = /Wins\s*\/\s*Matches\s*(\d+)\s*\/\s*(\d+)/i;
  const winsMatch = html.match(winsPattern);

  const pointsPattern = /Points Scored[^0-9]*(\d[\d,]*)/i;
  const pointsMatch = html.match(pointsPattern);

  const avgShotPattern = /Average Shot Time[^0-9]*([\d.]+)/i;
  const avgShotMatch = html.match(avgShotPattern);

  const breaks50Pattern = /Breaks 50\+[^0-9]*(\d+)/i;
  const breaks50Match = html.match(breaks50Pattern);

  const breaks100Pattern = /Breaks 100\+[^0-9]*(\d+)/i;
  const breaks100Match = html.match(breaks100Pattern);

  const highBreakPattern = /Highest Break[^0-9]*(\d+)/i;
  const highBreakMatch = html.match(highBreakPattern);

  if (!winsMatch && !pointsMatch) return null;

  const wins = winsMatch?.[1] ? parseInt(winsMatch[1], 10) : 0;
  const totalMatches = winsMatch?.[2] ? parseInt(winsMatch[2], 10) : 0;
  const losses = totalMatches - wins;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const season = month < 6 ? `${year - 1}/${year}` : `${year}/${year + 1}`;

  return {
    season,
    wins,
    losses,
    draws: 0,
    pointsScored: pointsMatch?.[1] ? parseInt(pointsMatch[1].replace(/,/g, ''), 10) : 0,
    avgShotTime: avgShotMatch?.[1] ? parseFloat(avgShotMatch[1]) : null,
    breaks50: breaks50Match?.[1] ? parseInt(breaks50Match[1], 10) : 0,
    breaks100: breaks100Match?.[1] ? parseInt(breaks100Match[1], 10) : 0,
    highestBreak: highBreakMatch?.[1] ? parseInt(highBreakMatch[1], 10) : null,
  };
}
