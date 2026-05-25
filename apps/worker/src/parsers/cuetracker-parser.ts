import type {
  ExternalBreakBuckets,
  ExternalFrameDetail,
  ExternalHeadToHeadComparison,
  ExternalHeadToHeadMatchStats,
  ExternalHeadToHeadSummary,
  ExternalImportResult,
  ExternalMatchResult,
  ExternalSeasonStats,
} from '@snooker/shared';

const USER_AGENT = 'SnookerPlayerOS/1.0 (development tracker)';
const REQUEST_DELAY_MS = 2500;
const HEAD_TO_HEAD_DELAY_MS = 500;
const HEAD_TO_HEAD_TIMEOUT_MS = 8_000;
const MAX_HEAD_TO_HEAD_REQUESTS = 40;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string, timeoutMs = 30_000): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.text();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n');
}

export function extractCuetrackerSlug(url: string): string | null {
  const match = url.match(/cuetracker\.net\/players\/([a-z0-9-]+)/i);
  return match?.[1] ?? null;
}

export async function parseCuetracker(
  slug: string,
  season?: string,
): Promise<ExternalImportResult> {
  const currentSeason = season ?? getCurrentSeason();
  const url = `https://cuetracker.net/players/${slug}/season/${currentSeason}?status=professional&categories=ranking,minor-ranking,non-ranking,league,invitational,tour-qualifier,6-reds`;
  const html = await fetchHtml(url);

  const matches = parseMatches(html, slug, currentSeason);
  const seasonStats = parseSeasonStats(html, currentSeason);
  const playerName = parsePlayerName(html);
  const headToHeads = await parseHeadToHeads(matches);

  return { matches, seasonStats, headToHeads, playerName };
}

function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month < 6) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
}

function parsePlayerName(html: string): string | null {
  const match = html.match(/<h1[^>]*>([^<]+)/i);
  if (match?.[1]) {
    const name = match[1].replace(/\s*-\s*Season.*$/i, '').trim();
    return name || null;
  }
  const titleMatch = html.match(/<title>([^<]+)/i);
  if (titleMatch?.[1]) {
    const name = titleMatch[1].split('-')[0]?.trim();
    return name || null;
  }
  return null;
}

type PlayerRef = { slug: string; name: string; index: number };

type PointBlock = {
  firstPoints: number;
  secondPoints: number;
  totalPoints: number;
  firstAvg: number | null;
  secondAvg: number | null;
  totalAvg: number | null;
  index: number;
};

function parseMatches(html: string, slug: string, season: string): ExternalMatchResult[] {
  const results: ExternalMatchResult[] = [];
  const text = stripHtml(html);

  const tournamentPattern = /href="(?:https:\/\/cuetracker\.net)?\/tournaments\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const tournaments: Array<{ name: string; index: number }> = [];
  let tMatch: RegExpExecArray | null;
  while ((tMatch = tournamentPattern.exec(html)) !== null) {
    tournaments.push({ name: (tMatch[2] ?? '').trim(), index: tMatch.index });
  }

  const roundPattern = /<h5[^>]*>([^<]+)<\/h5>/gi;
  const rounds: Array<{ name: string; index: number }> = [];
  let rMatch: RegExpExecArray | null;
  while ((rMatch = roundPattern.exec(html)) !== null) {
    rounds.push({ name: (rMatch[1] ?? '').trim(), index: rMatch.index });
  }

  const opponentPattern = /href="(?:https:\/\/cuetracker\.net)?\/players\/([a-z0-9-]+)\/season[^"]*"[^>]*>([^<]+)<\/a>/gi;
  const playerRefs: PlayerRef[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = opponentPattern.exec(html)) !== null) {
    playerRefs.push({
      slug: (pMatch[1] ?? '').toLowerCase(),
      name: (pMatch[2] ?? '').trim(),
      index: pMatch.index,
    });
  }

  const headToHeadPattern = /href="((?:https:\/\/cuetracker\.net)?\/head-to-head\/[^"]+)"/gi;
  const headToHeadRefs: Array<{ url: string; index: number }> = [];
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headToHeadPattern.exec(html)) !== null) {
    headToHeadRefs.push({ url: absoluteCuetrackerUrl(hMatch[1] ?? ''), index: hMatch.index });
  }

  const matchPattern = /Played on[\s\S]{0,300}?(\d{4}-\d{2}-\d{2})/gi;
  const datePositions: Array<{ date: string; htmlIndex: number; textIndex: number }> = [];

  let dMatch: RegExpExecArray | null;
  while ((dMatch = matchPattern.exec(html)) !== null) {
    datePositions.push({
      date: dMatch[1] ?? '',
      htmlIndex: dMatch.index,
      textIndex: -1,
    });
  }

  const frameScorePattern = /Frame scores\s+([\d(),-;\s]+?)(?:\s*Match progress)/g;
  const frameBlocks: Array<{ scores: string; index: number }> = [];
  let fMatch: RegExpExecArray | null;
  while ((fMatch = frameScorePattern.exec(text)) !== null) {
    frameBlocks.push({ scores: (fMatch[1] ?? '').trim(), index: fMatch.index });
  }

  const progressPattern = /Match progress\s+([\d\s,-]+?)(?:\s{2,}|\n)/g;
  const progressBlocks: Array<{ progress: string; index: number }> = [];
  let prMatch: RegExpExecArray | null;
  while ((prMatch = progressPattern.exec(text)) !== null) {
    progressBlocks.push({ progress: (prMatch[1] ?? '').trim(), index: prMatch.index });
  }

  const refereePattern = /Referee\s+(.+?)\s+Frame scores/g;
  const refereeBlocks: Array<{ referee: string; index: number }> = [];
  let refMatch: RegExpExecArray | null;
  while ((refMatch = refereePattern.exec(text)) !== null) {
    refereeBlocks.push({ referee: (refMatch[1] ?? '').trim(), index: refMatch.index });
  }

  const pointsPattern =
    /Points Scored\s+(\d[\d,]*)\s+(\d[\d,]*)\s+(\d[\d,]*)\s+Avg\. points\/frame\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g;
  const pointsBlocks: PointBlock[] = [];
  let ptMatch: RegExpExecArray | null;
  while ((ptMatch = pointsPattern.exec(text)) !== null) {
    pointsBlocks.push({
      firstPoints: parseInteger(ptMatch[1]),
      secondPoints: parseInteger(ptMatch[2]),
      totalPoints: parseInteger(ptMatch[3]),
      firstAvg: parseDecimal(ptMatch[4]),
      secondAvg: parseDecimal(ptMatch[5]),
      totalAvg: parseDecimal(ptMatch[6]),
      index: ptMatch.index,
    });
  }

  for (let i = 0; i < datePositions.length; i++) {
    const dp = datePositions[i]!;
    const date = dp.date;
    const htmlIdx = dp.htmlIndex;

    const tournament = findClosestBefore(tournaments, htmlIdx);
    const round = findClosestBefore(rounds, htmlIdx);
    const matchPlayers = findMatchPlayersBefore(playerRefs, htmlIdx);
    const playerIsFirst = matchPlayers[0]?.slug === slug.toLowerCase();
    const opponent = matchPlayers.find((player) => player.slug !== slug.toLowerCase());
    const headToHead = findClosestBefore(headToHeadRefs, htmlIdx);

    const frameBlock = frameBlocks[i];
    const progressBlock = progressBlocks[i];
    const pointsBlock = pointsBlocks[i];
    const refereeBlock = refereeBlocks[i];

    const frameScores = frameBlock
      ? frameBlock.scores.split(';').map((s) => s.trim()).filter(Boolean)
      : [];
    const frameDetails = frameScores.map((score, index) =>
      parseFrameDetail(score, index + 1, playerIsFirst),
    );
    const playerBreaks = frameDetails.flatMap((frame) => frame.playerBreaks);
    const opponentBreaks = frameDetails.flatMap((frame) => frame.opponentBreaks);

    const { framesWon, framesLost } = progressBlock
      ? parseMatchProgress(progressBlock.progress, playerIsFirst)
      : { framesWon: 0, framesLost: 0 };

    const breakProfile = {
      player: bucketBreaks(playerBreaks),
      opponent: bucketBreaks(opponentBreaks),
    };
    const breaks50 = playerBreaks.filter((value) => value >= 50 && value < 100).length;
    const breaks70 = playerBreaks.filter((value) => value >= 70 && value < 100).length;
    const breaks100 = playerBreaks.filter((value) => value >= 100).length;
    const highBreak = playerBreaks.length > 0 ? Math.max(...playerBreaks) : null;
    const bestOf = framesWon === framesLost ? null : Math.max(framesWon, framesLost) * 2 - 1;

    const sourceUrl = `https://cuetracker.net/players/${slug}/season/${season}`;
    const pointsFor = pointsBlock
      ? playerIsFirst
        ? pointsBlock.firstPoints
        : pointsBlock.secondPoints
      : 0;
    const pointsAgainst = pointsBlock
      ? playerIsFirst
        ? pointsBlock.secondPoints
        : pointsBlock.firstPoints
      : 0;
    const avgPointsFor = pointsBlock
      ? playerIsFirst
        ? pointsBlock.firstAvg
        : pointsBlock.secondAvg
      : null;
    const avgPointsAgainst = pointsBlock
      ? playerIsFirst
        ? pointsBlock.secondAvg
        : pointsBlock.firstAvg
      : null;

    results.push({
      date,
      tournament: tournament?.name ?? 'Unknown',
      round: round?.name ?? null,
      opponent: opponent?.name ?? 'Unknown',
      opponentExternalId: opponent?.slug ?? null,
      referee: refereeBlock?.referee ?? null,
      format: bestOf ? `Best of ${bestOf}` : null,
      playerIsFirst,
      headToHeadUrl: headToHead?.url ?? null,
      framesWon,
      framesLost,
      frameScores,
      frameDetails,
      matchProgress: progressBlock ? progressBlock.progress.split(',').map((value) => value.trim()) : [],
      playerBreaks,
      opponentBreaks,
      breaks50,
      breaks70,
      breaks100,
      highBreak,
      pointsFor,
      pointsAgainst,
      avgPointsFor,
      avgPointsAgainst,
      avgPointsTotal: pointsBlock?.totalAvg ?? null,
      breakProfile,
      sourceUrl: headToHead?.url ?? sourceUrl,
    });
  }

  return results;
}

function findClosestBefore<T extends { index: number }>(
  items: T[],
  position: number,
): T | null {
  let closest: T | null = null;
  for (const item of items) {
    if (item.index < position) {
      if (!closest || item.index > closest.index) closest = item;
    }
  }
  return closest;
}

function findMatchPlayersBefore(players: PlayerRef[], position: number): PlayerRef[] {
  const before = players.filter((player) => player.index < position);
  return before.slice(-2);
}

function parseMatchProgress(
  progress: string,
  playerIsFirst: boolean,
): { framesWon: number; framesLost: number } {
  const scores = progress.split(',').map((s) => s.trim()).filter(Boolean);
  const last = scores[scores.length - 1] ?? '';
  const parts = last.split('-');
  if (parts.length === 2) {
    const first = parseInteger(parts[0]);
    const second = parseInteger(parts[1]);
    return {
      framesWon: playerIsFirst ? first : second,
      framesLost: playerIsFirst ? second : first,
    };
  }
  return { framesWon: 0, framesLost: 0 };
}

function parseFrameDetail(
  rawScore: string,
  frameNumber: number,
  playerIsFirst: boolean,
): ExternalFrameDetail {
  const match = rawScore.match(/^\s*(\d+)(?:\(([^)]*)\))?\s*-\s*(\d+)(?:\(([^)]*)\))?/);
  if (!match) {
    return {
      rawScore,
      frameNumber,
      playerScore: null,
      opponentScore: null,
      playerBreaks: [],
      opponentBreaks: [],
      winner: 'UNKNOWN',
    };
  }

  const firstScore = parseInteger(match[1]);
  const secondScore = parseInteger(match[3]);
  const firstBreaks = parseBreakList(match[2]);
  const secondBreaks = parseBreakList(match[4]);
  const playerScore = playerIsFirst ? firstScore : secondScore;
  const opponentScore = playerIsFirst ? secondScore : firstScore;
  let winner: 'PLAYER' | 'OPPONENT' | 'UNKNOWN' = 'UNKNOWN';
  if (playerScore > opponentScore) winner = 'PLAYER';
  else if (opponentScore > playerScore) winner = 'OPPONENT';

  return {
    rawScore,
    frameNumber,
    playerScore,
    opponentScore,
    playerBreaks: playerIsFirst ? firstBreaks : secondBreaks,
    opponentBreaks: playerIsFirst ? secondBreaks : firstBreaks,
    winner,
  };
}

function parseBreakList(value: string | undefined): number[] {
  if (!value) return [];
  return value.split(',').map((part) => parseInteger(part)).filter((part) => part >= 50);
}

function bucketBreaks(breaks: number[]): ExternalBreakBuckets {
  return {
    breaks50: breaks.filter((value) => value >= 50 && value < 60).length,
    breaks60: breaks.filter((value) => value >= 60 && value < 70).length,
    breaks70: breaks.filter((value) => value >= 70 && value < 80).length,
    breaks80: breaks.filter((value) => value >= 80 && value < 90).length,
    breaks90: breaks.filter((value) => value >= 90 && value < 100).length,
    breaks100: breaks.filter((value) => value >= 100).length,
    total50Plus: breaks.length,
  };
}

function parseInteger(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDecimal(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function absoluteCuetrackerUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `https://cuetracker.net${path}`;
}

function parseSeasonStats(html: string, season: string): ExternalSeasonStats | null {
  const text = stripHtml(html);

  const matchesFramesMatch = text.match(
    /Matches\s*Played:\s*(\d+)\s+Won:\s*(\d+)[^\n]*?Lost:\s*(\d+)[^\n]*?Drawn:\s*(\d+)[\s\S]*?Frames\s*Played:\s*(\d+)\s+Won:\s*(\d+)[^\n]*?Lost:\s*(\d+)/i,
  );
  const winsMatch = text.match(/Won:\s*(\d+)/);
  const lostMatch = text.match(/Lost:\s*(\d+)/);
  const drawnMatch = text.match(/Drawn:\s*(\d+)/);

  if (!winsMatch && !lostMatch) return null;

  const wins = matchesFramesMatch ? parseInteger(matchesFramesMatch[2]) : parseInteger(winsMatch?.[1]);
  const losses = matchesFramesMatch ? parseInteger(matchesFramesMatch[3]) : parseInteger(lostMatch?.[1]);
  const draws = matchesFramesMatch ? parseInteger(matchesFramesMatch[4]) : parseInteger(drawnMatch?.[1]);

  const pointsMatch = text.match(/Points scored.*?For:\s*([\d,]+)\s+Against:\s*([\d,]+)/is);
  const pointsScored = parseInteger(pointsMatch?.[1]);
  const pointsAgainst = parseInteger(pointsMatch?.[2]);

  const highBreakMatch = text.match(/50\+ Breaks[\s\S]*?(\d{2,3})(?:,|\s)/);
  let highestBreak: number | null = null;
  const allBreaks = [...text.matchAll(/50\+ Breaks\s+([\d,\s]+)/g)];
  if (allBreaks.length > 0) {
    const allValues: number[] = [];
    for (const b of allBreaks) {
      const vals = [...(b[1] ?? '').matchAll(/(\d+)/g)].map((m) => parseInt(m[1] ?? '0', 10));
      allValues.push(...vals);
    }
    highestBreak = allValues.length > 0 ? Math.max(...allValues) : null;
  } else if (highBreakMatch?.[1]) {
    highestBreak = parseInt(highBreakMatch[1], 10);
  }

  const breakRow = text.match(/Breaks\s+About this stat\s+Breaks\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
  const breaks50 = parseInteger(breakRow?.[1]);
  const breaks60 = parseInteger(breakRow?.[2]);
  const breaks70 = parseInteger(breakRow?.[3]);
  const breaks80 = parseInteger(breakRow?.[4]);
  const breaks90 = parseInteger(breakRow?.[5]);

  let breaks100 = parseInteger(breakRow?.[6]);
  const centuryListMatch = html.match(/Centuries[\s\S]*?<\/table>/i);
  if (!breaks100 && centuryListMatch) {
    const centuries = [...centuryListMatch[0].matchAll(/\b1[0-4]\d\b/g)];
    breaks100 = centuries.length;
  }

  const stats: ExternalSeasonStats = {
    season,
    wins,
    losses,
    draws,
    matchesPlayed: matchesFramesMatch ? parseInteger(matchesFramesMatch[1]) : wins + losses + draws,
    framesPlayed: parseInteger(matchesFramesMatch?.[5]),
    framesWon: parseInteger(matchesFramesMatch?.[6]),
    framesLost: parseInteger(matchesFramesMatch?.[7]),
    pointsScored,
    pointsAgainst,
    avgShotTime: null,
    breaks50,
    breaks60,
    breaks70,
    breaks80,
    breaks90,
    breaks100,
    highestBreak,
    matchLengths: parseMatchLengths(text),
    roundsPlayed: parseRoundsPlayed(text),
    prizeMoney: [],
  };
  const decidingFrames = parsePlayedWonStat(text, /Deciding frames:/i);
  if (decidingFrames) stats.decidingFrames = decidingFrames;
  const whitewashes = parsePlayedWonStat(text, /Whitewashes:/i);
  if (whitewashes) stats.whitewashes = whitewashes;
  const firstMatches = parsePlayedWonStat(text, /First match in tournament:/i);
  if (firstMatches) stats.firstMatches = firstMatches;
  return stats;
}

function parsePlayedWonStat(
  text: string,
  label: RegExp,
): { played: number; won: number; winRate: number | null } | undefined {
  const start = text.search(label);
  if (start < 0) return undefined;
  const excerpt = text.slice(start, start + 120);
  const match = excerpt.match(/Played:\s*(\d+)\s+Won:\s*(\d+)\s+\(([^)]+)%\)/i);
  if (!match) return undefined;
  return {
    played: parseInteger(match[1]),
    won: parseInteger(match[2]),
    winRate: parseDecimal(match[3]),
  };
}

function parseMatchLengths(
  text: string,
): Array<{ bestOf: number; played: number; won: number; winRate: number | null }> {
  const segment = boundedSegment(text, 'Match lengths played:', 'Rounds played:');
  const rows: Array<{ bestOf: number; played: number; won: number; winRate: number | null }> = [];
  const pattern = /(\d+)\s+(\d+)\s+(\d+)\s+\(([^)]+)%\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(segment)) !== null) {
    rows.push({
      bestOf: parseInteger(match[1]),
      played: parseInteger(match[2]),
      won: parseInteger(match[3]),
      winRate: parseDecimal(match[4]),
    });
  }
  return rows;
}

function parseRoundsPlayed(
  text: string,
): Array<{ round: string; played: number; won: number; winRate: number | null }> {
  const segment = boundedSegment(text, 'Rounds played:', 'Breaks');
  const rows: Array<{ round: string; played: number; won: number; winRate: number | null }> = [];
  const pattern = /((?:Semi|Quarter)-final|Final|Last\s+\d+|Group\s+\d+)\s+(\d+)\s+(\d+)\s+\(([^)]+)%\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(segment)) !== null) {
    rows.push({
      round: match[1] ?? 'Unknown',
      played: parseInteger(match[2]),
      won: parseInteger(match[3]),
      winRate: parseDecimal(match[4]),
    });
  }
  return rows;
}

function boundedSegment(text: string, startLabel: string, endLabel: string): string {
  const start = text.indexOf(startLabel);
  if (start < 0) return '';
  const end = text.indexOf(endLabel, start + startLabel.length);
  return end < 0 ? text.slice(start) : text.slice(start, end);
}

async function parseHeadToHeads(matches: ExternalMatchResult[]): Promise<ExternalHeadToHeadSummary[]> {
  const unique = new Map<string, ExternalMatchResult>();
  for (const match of matches) {
    if (!match.headToHeadUrl || !match.opponentExternalId) continue;
    unique.set(match.headToHeadUrl, match);
  }

  const summaries: ExternalHeadToHeadSummary[] = [];
  const candidates = [...unique.values()].slice(0, MAX_HEAD_TO_HEAD_REQUESTS);
  for (const match of candidates) {
    if (!match.headToHeadUrl || !match.opponentExternalId) continue;
    await delay(HEAD_TO_HEAD_DELAY_MS);
    try {
      const html = await fetchHtml(match.headToHeadUrl, HEAD_TO_HEAD_TIMEOUT_MS);
      summaries.push(parseHeadToHeadPage(html, match));
    } catch (error) {
      console.warn(
        `[worker] cuetracker head-to-head skipped for ${match.opponent}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return summaries;
}

function parseHeadToHeadPage(html: string, sourceMatch: ExternalMatchResult): ExternalHeadToHeadSummary {
  const text = stripHtml(html).replace(/\s+/g, ' ');
  const comparisonOrder = parseHeadToHeadOrder(text, sourceMatch);
  return {
    url: sourceMatch.headToHeadUrl ?? sourceMatch.sourceUrl,
    opponent: sourceMatch.opponent,
    opponentExternalId: sourceMatch.opponentExternalId ?? '',
    fetchedAt: new Date().toISOString(),
    comparison: parseHeadToHeadComparison(text, comparisonOrder),
    matchStats: parseHeadToHeadMatchStats(text, comparisonOrder),
    roundsPlayed: parseHeadToHeadRounds(text, comparisonOrder),
  };
}

function parseHeadToHeadOrder(
  text: string,
  sourceMatch: ExternalMatchResult,
): { playerIsFirst: boolean; firstLabel: string; secondLabel: string } {
  const title = text.match(/Head-to-Head:\s+(.+?)\s+Vs\s+(.+?)\s+Filtering/i);
  const firstLabel = lastNameLabel(title?.[1] ?? 'First');
  const secondLabel = lastNameLabel(title?.[2] ?? 'Second');
  const slugs = sourceMatch.headToHeadUrl?.match(/head-to-head\/([^/?#]+)\/([^/?#]+)/i);
  const firstSlug = slugs?.[1]?.toLowerCase();
  const playerIsFirst = firstSlug !== sourceMatch.opponentExternalId?.toLowerCase();
  return { playerIsFirst, firstLabel, secondLabel };
}

function parseHeadToHeadComparison(
  text: string,
  order: { playerIsFirst: boolean; firstLabel: string; secondLabel: string },
): ExternalHeadToHeadComparison | null {
  const first = emptyHeadToHeadComparisonPlayer();
  const second = emptyHeadToHeadComparisonPlayer();
  const seasons = text.match(/Comparison\s+.+?\s+.+?\s+(\d+)\s+Seasons as Professional\s+(\d+)/i);
  first.seasonsAsProfessional = parseNullableInteger(seasons?.[1]);
  second.seasonsAsProfessional = parseNullableInteger(seasons?.[2]);

  const matches = text.match(
    /([\d,]+)\s+([\d,]+)\s+\([^)]+\)\s+Matches Played \| Won\s+([\d,]+)\s+([\d,]+)\s+\([^)]+\)/i,
  );
  first.matchesPlayed = parseNullableInteger(matches?.[1]);
  first.matchesWon = parseNullableInteger(matches?.[2]);
  second.matchesPlayed = parseNullableInteger(matches?.[3]);
  second.matchesWon = parseNullableInteger(matches?.[4]);

  const losses = text.match(
    /([\d,]+)\s+\([^)]+\)\s+([\d,]+)\s+\([^)]+\)\s+Matches Lost \| Drawn\s+([\d,]+)\s+\([^)]+\)\s+([\d,]+)\s+\([^)]+\)/i,
  );
  first.matchesLost = parseNullableInteger(losses?.[1]);
  first.matchesDrawn = parseNullableInteger(losses?.[2]);
  second.matchesLost = parseNullableInteger(losses?.[3]);
  second.matchesDrawn = parseNullableInteger(losses?.[4]);

  const frames = text.match(
    /([\d,]+)\s+([\d,]+)\s+\([^)]+\)\s+Frames Played \| Won\s+([\d,]+)\s+([\d,]+)\s+\([^)]+\)/i,
  );
  first.framesPlayed = parseNullableInteger(frames?.[1]);
  first.framesWon = parseNullableInteger(frames?.[2]);
  second.framesPlayed = parseNullableInteger(frames?.[3]);
  second.framesWon = parseNullableInteger(frames?.[4]);

  const centuries = text.match(/([\d,]+)\s+([\d.]+)\s+Centuries Made \| Rate\s+([\d,]+)\s+([\d.]+)/i);
  first.centuriesMade = parseNullableInteger(centuries?.[1]);
  first.centuryRate = parseDecimal(centuries?.[2]);
  second.centuriesMade = parseNullableInteger(centuries?.[3]);
  second.centuryRate = parseDecimal(centuries?.[4]);

  const maximums = text.match(/(\d+)\s+Maximums made\s+(\d+)/i);
  first.maximumsMade = parseNullableInteger(maximums?.[1]);
  second.maximumsMade = parseNullableInteger(maximums?.[2]);

  const deciders = text.match(
    /([\d,]+)\s+([\d,]+)\s+\([^)]+\)\s+Deciders Played \| Won\s+([\d,]+)\s+([\d,]+)\s+\([^)]+\)/i,
  );
  first.decidersPlayed = parseNullableInteger(deciders?.[1]);
  first.decidersWon = parseNullableInteger(deciders?.[2]);
  second.decidersPlayed = parseNullableInteger(deciders?.[3]);
  second.decidersWon = parseNullableInteger(deciders?.[4]);

  const whitewashes = text.match(
    /([\d,]+)\s+([\d,]+)\s+\([^)]+\)\s+Whitewashes Played \| Won\s+([\d,]+)\s+([\d,]+)\s+\([^)]+\)/i,
  );
  first.whitewashesPlayed = parseNullableInteger(whitewashes?.[1]);
  first.whitewashesWon = parseNullableInteger(whitewashes?.[2]);
  second.whitewashesPlayed = parseNullableInteger(whitewashes?.[3]);
  second.whitewashesWon = parseNullableInteger(whitewashes?.[4]);

  const prizeMoney = text.match(/GBP\s+([\d,]+)\s+Prize Money\s+GBP\s+([\d,]+)/i);
  first.prizeMoney = parseNullableInteger(prizeMoney?.[1]);
  second.prizeMoney = parseNullableInteger(prizeMoney?.[2]);

  const player = order.playerIsFirst ? first : second;
  const opponent = order.playerIsFirst ? second : first;
  return {
    playerLabel: order.playerIsFirst ? order.firstLabel : order.secondLabel,
    opponentLabel: order.playerIsFirst ? order.secondLabel : order.firstLabel,
    player,
    opponent,
  };
}

function parseHeadToHeadMatchStats(
  text: string,
  order: { playerIsFirst: boolean },
): ExternalHeadToHeadMatchStats | null {
  const match = text.match(
    /Match stats\s+Matches Played:\s*(\d+)\s+[^:]+:\s*(\d+)\s+\([^)]+\)\s+[^:]+:\s*(\d+)\s+\([^)]+\)\s+Drawn:\s*(\d+)\s+\([^)]+\)\s+Frames Played:\s*(\d+)\s+[^:]+:\s*(\d+)\s+\([^)]+\)\s+[^:]+:\s*(\d+)\s+\([^)]+\)/i,
  );
  if (!match) return null;
  const firstWins = parseInteger(match[2]);
  const secondWins = parseInteger(match[3]);
  const firstFramesWon = parseInteger(match[6]);
  const secondFramesWon = parseInteger(match[7]);
  return {
    matchesPlayed: parseInteger(match[1]),
    playerWins: order.playerIsFirst ? firstWins : secondWins,
    opponentWins: order.playerIsFirst ? secondWins : firstWins,
    draws: parseInteger(match[4]),
    framesPlayed: parseInteger(match[5]),
    playerFramesWon: order.playerIsFirst ? firstFramesWon : secondFramesWon,
    opponentFramesWon: order.playerIsFirst ? secondFramesWon : firstFramesWon,
  };
}

function parseHeadToHeadRounds(
  text: string,
  order: { playerIsFirst: boolean },
): ExternalHeadToHeadSummary['roundsPlayed'] {
  const segment = boundedSegment(text, 'Rounds Played', '&copy;');
  const rows: ExternalHeadToHeadSummary['roundsPlayed'] = [];
  const pattern = /((?:Semi|Quarter)-final|Final|Last\s+\d+|Group\s+\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(segment)) !== null) {
    const firstWins = parseInteger(match[3]);
    const secondWins = parseInteger(match[4]);
    rows.push({
      round: match[1] ?? 'Unknown',
      played: parseInteger(match[2]),
      playerWins: order.playerIsFirst ? firstWins : secondWins,
      opponentWins: order.playerIsFirst ? secondWins : firstWins,
    });
  }
  return rows;
}

function emptyHeadToHeadComparisonPlayer(): ExternalHeadToHeadComparison['player'] {
  return {
    seasonsAsProfessional: null,
    matchesPlayed: null,
    matchesWon: null,
    matchesLost: null,
    matchesDrawn: null,
    framesPlayed: null,
    framesWon: null,
    centuriesMade: null,
    centuryRate: null,
    maximumsMade: null,
    decidersPlayed: null,
    decidersWon: null,
    whitewashesPlayed: null,
    whitewashesWon: null,
    prizeMoney: null,
  };
}

function parseNullableInteger(value: string | undefined): number | null {
  if (!value) return null;
  return parseInteger(value);
}

function lastNameLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name.trim();
}

export async function parseCuetrackerWithDelay(
  slug: string,
  season?: string,
): Promise<ExternalImportResult> {
  await delay(REQUEST_DELAY_MS);
  return parseCuetracker(slug, season);
}
