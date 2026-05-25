import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AiReportStatus,
  AiReportType,
  CalendarEventSource,
  CalendarEventType,
  DominantHand,
  DrillAttemptResult,
  DrillCategory,
  DrillDifficulty,
  DrillVisibility,
  FrameWinner,
  MatchResult,
  MatchSource,
  Prisma,
  PrismaClient,
  RoleType,
  TrainingSessionType,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const DEMO_EMAIL = 'customer.player.demo@snooker.local';
const DEMO_PASSWORD = 'CustomerDemo2026!';
const DEMO_DISPLAY_NAME = 'Customer Demo Player';
const DAY_MS = 24 * 60 * 60 * 1000;

type DrillTemplateSeedRef = {
  id: string;
  name: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  defaultTableLayoutJson: Prisma.JsonValue | null;
};

type TrainingSessionSeedSummary = {
  id: string;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
};

type MatchSeedSummary = {
  id: string;
  opponentName: string;
  matchDate: Date;
  tournament: string | null;
  framesWon: number;
  framesLost: number;
};

type SupplementSeedSummary = {
  name: string;
  startDate: Date;
  endDate: Date | null;
};

loadEnvironment();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const anchorDate = startOfUtcDay(new Date());
  await resetDemoUser();

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      displayName: DEMO_DISPLAY_NAME,
      status: UserStatus.ACTIVE,
      lastLoginAt: atDayOffset(anchorDate, -1, 19, 45),
      roles: { create: [{ roleType: RoleType.PLAYER }] },
      playerProfile: {
        create: {
          firstName: 'Nikita',
          lastName: 'Volkov',
          dateOfBirth: new Date(Date.UTC(2007, 2, 14)),
          country: 'Poland',
          dominantHand: DominantHand.RIGHT,
          level: 'Advanced junior / academy prospect',
          seasonGoal:
            'Stabilize long-pot percentage above 55%, build reliable 30+ breaks under pressure and prepare for regional junior ranking events.',
        },
      },
    },
    include: { playerProfile: true },
  });

  if (!user.playerProfile) {
    throw new Error('Demo player profile was not created.');
  }

  const playerProfileId = user.playerProfile.id;
  await seedEquipment(playerProfileId, anchorDate);
  const customTemplates = await seedCustomDrillTemplates(user.id);
  const systemTemplates = await findSystemDrillTemplates();
  const drillTemplates = [...systemTemplates, ...customTemplates];

  const lifestyleCount = await seedLifestyleFactors(playerProfileId, anchorDate);
  const supplementSummaries = await seedSupplementEvents(playerProfileId, user.id, anchorDate);
  const calendarRows: Prisma.CalendarEventCreateManyInput[] = [];
  const trainingSummaries = await seedTrainingSessions(playerProfileId, user.id, drillTemplates, anchorDate, calendarRows);
  const matchSummaries = await seedMatches(playerProfileId, user.id, anchorDate, calendarRows);

  addCalendarTimelineEvents(calendarRows, playerProfileId, user.id, anchorDate, trainingSummaries, matchSummaries, supplementSummaries);
  await prisma.calendarEvent.createMany({ data: calendarRows });

  const aiReportCount = await seedAiReports(playerProfileId, user.id, anchorDate, {
    trainingSessions: trainingSummaries.length,
    matches: matchSummaries.length,
    calendarEvents: calendarRows.length,
    lifestyleFactors: lifestyleCount,
    supplementEvents: supplementSummaries.length,
  });

  const totals = await collectTotals(playerProfileId);

  console.log('Demo customer profile seeded.');
  console.log(`Login: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Player profile: ${user.playerProfile.firstName} ${user.playerProfile.lastName}`);
  console.log(
    `Seeded: ${totals.trainingSessions} training sessions, ${totals.drillExecutions} drill executions, ${totals.drillAttempts} drill attempts, ${totals.matches} matches, ${totals.calendarEvents} calendar events, ${totals.lifestyleFactors} lifestyle factors, ${totals.supplementEvents} supplement events, ${aiReportCount} AI reports.`,
  );
}

async function resetDemoUser(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { playerProfile: { select: { id: true } } },
  });

  if (!existing) return;

  if (existing.playerProfile) {
    await prisma.playerProfile.delete({ where: { id: existing.playerProfile.id } });
  }

  await prisma.drillTemplate.deleteMany({ where: { createdByUserId: existing.id } });
  await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
  await prisma.role.deleteMany({ where: { userId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
}

async function seedEquipment(playerProfileId: string, anchorDate: Date): Promise<void> {
  await prisma.equipmentProfile.createMany({
    data: [
      {
        playerProfileId,
        cueName: 'Club house cue 18 oz',
        cueWeight: 18,
        tipBrand: 'Club standard',
        tipSize: 9.8,
        tipChangeDate: atDayOffset(anchorDate, -420),
        extension: 'None',
        chalk: 'Triangle blue',
        notes: 'First tracked setup before buying a personal cue. Useful baseline for old match data.',
        activeFrom: atDayOffset(anchorDate, -520),
        activeTo: atDayOffset(anchorDate, -331),
      },
      {
        playerProfileId,
        cueName: 'Peradon Crown 58"',
        cueWeight: 18.5,
        tipBrand: 'Elk Master medium',
        tipSize: 9.5,
        tipChangeDate: atDayOffset(anchorDate, -230),
        extension: '6 inch mini butt',
        chalk: 'Taom Pyro green',
        notes: 'First personal cue. Better touch, but long pots still drifted under pressure.',
        activeFrom: atDayOffset(anchorDate, -330),
        activeTo: atDayOffset(anchorDate, -121),
      },
      {
        playerProfileId,
        cueName: 'Peradon Crown 58" with harder tip',
        cueWeight: 18.5,
        tipBrand: 'Century G3',
        tipSize: 9.4,
        tipChangeDate: atDayOffset(anchorDate, -120),
        extension: '6 inch mini butt',
        chalk: 'Taom V10 green',
        notes: 'Tip change improved stun control but needed two weeks of adjustment on soft safety shots.',
        activeFrom: atDayOffset(anchorDate, -120),
        activeTo: atDayOffset(anchorDate, -46),
      },
      {
        playerProfileId,
        cueName: 'John Parris Classic custom fit',
        cueWeight: 18.2,
        tipBrand: 'Century G2',
        tipSize: 9.3,
        tipChangeDate: atDayOffset(anchorDate, -45),
        extension: 'Telescopic extension + mini butt',
        chalk: 'Taom V10 green',
        notes: 'Current setup. Short backswing is more stable, especially on black-ball routines.',
        activeFrom: atDayOffset(anchorDate, -45),
      },
    ],
  });
}

async function findSystemDrillTemplates(): Promise<DrillTemplateSeedRef[]> {
  const templates = await prisma.drillTemplate.findMany({
    where: { visibility: DrillVisibility.SYSTEM },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      category: true,
      difficulty: true,
      defaultTableLayoutJson: true,
    },
  });

  if (templates.length < 8) {
    throw new Error('System drill templates are missing. Run Prisma migrations before seeding the demo profile.');
  }

  return templates;
}

async function seedCustomDrillTemplates(userId: string): Promise<DrillTemplateSeedRef[]> {
  const definitions = [
    {
      name: 'Личная рутина: 20-минутная проверка прямого кия',
      category: DrillCategory.CUE_ACTION,
      difficulty: DrillDifficulty.INTERMEDIATE,
      description: 'Личный технический чекпоинт перед серьёзными сессиями на забивание.',
      goal: 'Подтвердить выравнивание, паузу и сопровождение кия перед длинными красными.',
      rules: 'Три блока по десять центральных ударов. Промахи фиксируй по причине, а не только по результату.',
      successCriteria: 'Минимум 24 удара по линии из 30 попыток и без повторяющейся ошибки «опускание плеча».',
      tags: ['личное', 'рутина', 'разминка'],
      metricsSchemaJson: metricsSchema(['attempts', 'line_hits', 'cue_ball_deviation_mm', 'routine_kept']),
      defaultTableLayoutJson: simpleLayout('customer-straight-cue', 'Тест прямого кия'),
    },
    {
      name: 'Личный паттерн: восстановление позиции на чёрном',
      category: DrillCategory.POSITIONAL_PLAY,
      difficulty: DrillDifficulty.ADVANCED,
      description: 'Личный паттерн восстановления, когда угол на чёрный получился чуть хуже плана.',
      goal: 'Вернуть позицию, не вытягивая белый к боковому борту.',
      rules: 'Играй чёрный из трёх стартовых позиций белого и отмечай, естественный ли выход на следующий красный.',
      successCriteria: 'Два успешных восстановления позиции в каждом блоке из трёх ударов.',
      tags: ['личное', 'чёрный', 'восстановление'],
      metricsSchemaJson: metricsSchema(['attempts', 'pots', 'position_hits', 'position_errors']),
      defaultTableLayoutJson: simpleLayout('customer-black-recovery', 'Коридор восстановления чёрного'),
    },
    {
      name: 'Личная защита: тонкий красный и замок в баульте',
      category: DrillCategory.SAFETY,
      difficulty: DrillDifficulty.ADVANCED,
      description: 'Личное тактическое упражнение на устранение утечки при контакте в полшара.',
      goal: 'Оставить белый за баульными цветными, объектный шар — у верхнего борта.',
      rules: 'По десять защит с каждой стороны стола. Зачитывай только позиции, где забить напрямую нельзя.',
      successCriteria: 'Минимум 16 безопасных оставлений из 20 попыток и меньше трёх тактических утечек.',
      tags: ['личное', 'safety', 'баульт'],
      metricsSchemaJson: metricsSchema(['attempts', 'safe_leaves', 'cue_ball_zone_hits', 'tactical_errors']),
      defaultTableLayoutJson: simpleLayout('customer-baulk-lock', 'Замок в баульте'),
    },
    {
      name: 'Личная симуляция матча: первый визит на 30+',
      category: DrillCategory.MATCH_SIMULATION,
      difficulty: DrillDifficulty.PROFESSIONAL,
      description: 'Личная симуляция матча для конвертации первого открытого шанса в давление на табло.',
      goal: 'Сделать так, чтобы первый визит давал реальный отрыв, а не вклад в 8–12 очков.',
      rules: 'Старт с полуоткрытой пирамиды. Попытка завершается промахом, плохой позицией или тактическим сбросом.',
      successCriteria: 'В среднем 24+ очка за попытку и минимум один визит 30+ за сессию.',
      tags: ['личное', 'матч', 'брейк'],
      metricsSchemaJson: metricsSchema(['attempts', 'break_points', 'max_run', 'decision_errors', 'execution_errors']),
      defaultTableLayoutJson: simpleLayout('customer-first-visit-30', 'Конверсия первого визита'),
    },
  ] satisfies Array<{
    name: string;
    category: DrillCategory;
    difficulty: DrillDifficulty;
    description: string;
    goal: string;
    rules: string;
    successCriteria: string;
    tags: string[];
    metricsSchemaJson: Prisma.InputJsonValue;
    defaultTableLayoutJson: Prisma.InputJsonValue;
  }>;

  const createdTemplates: DrillTemplateSeedRef[] = [];
  for (const definition of definitions) {
    const template = await prisma.drillTemplate.create({
      data: {
        ...definition,
        visibility: DrillVisibility.PRIVATE,
        createdBy: { connect: { id: userId } },
      },
      select: {
        id: true,
        name: true,
        category: true,
        difficulty: true,
        defaultTableLayoutJson: true,
      },
    });
    createdTemplates.push(template);
  }

  return createdTemplates;
}

async function seedLifestyleFactors(playerProfileId: string, anchorDate: Date): Promise<number> {
  const moods = ['calm', 'focused', 'flat', 'sharp', 'restless', 'confident'];
  const rows: Prisma.LifestyleFactorCreateManyInput[] = [];

  for (let index = 0; index < 120; index += 1) {
    const dayOffset = index - 119;
    const travel = index % 19 === 0 || index % 31 === 0;
    const illness = dayOffset >= -74 && dayOffset <= -72;
    const injury = dayOffset >= -49 && dayOffset <= -45;
    const sleepBase = 7.1 + ((index % 9) - 4) * 0.18 - (travel ? 0.45 : 0) - (illness ? 0.8 : 0);
    const fatigue = clampInt(3 + (travel ? 2 : 0) + (illness ? 3 : 0) + (injury ? 2 : 0) + (index % 4 === 0 ? 1 : 0), 1, 10);
    const focus = clampInt(8 - Math.floor(fatigue / 2) + (index % 6 === 0 ? 1 : 0), 1, 10);

    rows.push({
      playerProfileId,
      date: atDayOffset(anchorDate, dayOffset),
      sleepHours: Math.round(sleepBase * 10) / 10,
      sleepQuality: clampInt(Math.round(sleepBase), 1, 10),
      fatigue,
      stress: clampInt(3 + (index % 7 === 0 ? 2 : 0) + (travel ? 1 : 0), 1, 10),
      focus,
      mood: pick(moods, index),
      illness,
      injury,
      travel,
      notes: lifestyleNote(dayOffset, travel, illness, injury),
    });
  }

  await prisma.lifestyleFactor.createMany({ data: rows });
  return rows.length;
}

async function seedSupplementEvents(playerProfileId: string, userId: string, anchorDate: Date): Promise<SupplementSeedSummary[]> {
  const rows: Prisma.SupplementEventCreateManyInput[] = [
    {
      playerProfileId,
      createdByUserId: userId,
      name: 'Hydration electrolyte mix',
      category: 'hydration',
      startDate: atDayOffset(anchorDate, -105),
      endDate: null,
      dosageNote: 'Historical log entry from training diary; not a recommendation.',
      reason: 'Used around long sessions and travel days to keep routines consistent.',
      notes: 'Coach tracks perceived energy only, no medical conclusions.',
    },
    {
      playerProfileId,
      createdByUserId: userId,
      name: 'Vitamin D winter plan',
      category: 'wellness',
      startDate: atDayOffset(anchorDate, -92),
      endDate: atDayOffset(anchorDate, -21),
      dosageNote: 'Recorded as family/clinician-managed context, not an app instruction.',
      reason: 'Seasonal wellness context for fatigue notes.',
      notes: 'Kept out of performance conclusions unless the user explicitly reviews it.',
    },
    {
      playerProfileId,
      createdByUserId: userId,
      name: 'Caffeine-free focus routine',
      category: 'routine',
      startDate: atDayOffset(anchorDate, -64),
      endDate: atDayOffset(anchorDate, -36),
      dosageNote: 'Breathing, water and snack timing only.',
      reason: 'Alternative to stimulants during evening match practice.',
      notes: 'Useful for testing supplement/routine history without sensitive dosage advice.',
    },
    {
      playerProfileId,
      createdByUserId: userId,
      name: 'Tournament snack protocol',
      category: 'nutrition routine',
      startDate: atDayOffset(anchorDate, -18),
      endDate: null,
      dosageNote: 'Food timing notes only; no supplement recommendation.',
      reason: 'Avoid energy dips in afternoon frames.',
      notes: 'Tracked as context for match-day focus and fatigue.',
    },
  ];

  await prisma.supplementEvent.createMany({ data: rows });
  return rows.map((row) => ({ name: row.name, startDate: toDate(row.startDate), endDate: row.endDate ? toDate(row.endDate) : null }));
}

async function seedTrainingSessions(
  playerProfileId: string,
  userId: string,
  drillTemplates: DrillTemplateSeedRef[],
  anchorDate: Date,
  calendarRows: Prisma.CalendarEventCreateManyInput[],
): Promise<TrainingSessionSeedSummary[]> {
  const summaries: TrainingSessionSeedSummary[] = [];
  const titles = [
    'Long-pot accuracy block',
    'Cue action and tempo reset',
    'Break-building around black',
    'Safety and escape lab',
    'Match-prep pressure set',
    'Coach review and correction',
    'First chance conversion',
    'Color clearance routine',
  ];
  const goals = [
    'Raise quality of first contact and keep the body still through delivery.',
    'Convert simple openings into 20+ visits with fewer position leaks.',
    'Make safety choices earlier and avoid leaving short replies.',
    'Keep the same pre-shot rhythm when the drill has a match score attached.',
  ];

  for (let sessionIndex = 0; sessionIndex < 56; sessionIndex += 1) {
    const dayOffset = -91 + Math.floor(sessionIndex * 1.64);
    const startedAt = atDayOffset(anchorDate, dayOffset, 9 + (sessionIndex % 6), (sessionIndex * 11) % 50);
    const durationMinutes = 75 + (sessionIndex % 5) * 18;
    const isOpenSession = sessionIndex === 55;
    const endedAt = isOpenSession ? null : addMinutes(startedAt, durationMinutes);
    const sessionType = sessionTypeForIndex(sessionIndex);
    const executionCount = 2 + (sessionIndex % 3);
    const drillExecutions: Prisma.DrillExecutionCreateWithoutTrainingSessionInput[] = [];

    for (let executionIndex = 0; executionIndex < executionCount; executionIndex += 1) {
      const template = pick(drillTemplates, sessionIndex * 3 + executionIndex * 5);
      const executionStartedAt = addMinutes(startedAt, executionIndex * 24);
      const executionEndedAt = isOpenSession && executionIndex === executionCount - 1 ? null : addMinutes(executionStartedAt, 18 + executionIndex * 7);
      const attemptCount = 8 + ((sessionIndex + executionIndex * 3) % 13);
      const attempts = buildAttempts(sessionIndex, executionIndex, attemptCount, template, executionStartedAt);
      const successes = attempts.filter((attempt) => attempt.result === DrillAttemptResult.SUCCESS).length;
      const partials = attempts.filter((attempt) => attempt.result === DrillAttemptResult.PARTIAL).length;
      const errorTags = summarizeErrorTags(attempts);
      const score = Math.round(((successes + partials * 0.45) / attemptCount) * 1000) / 10;
      const executionData: Prisma.DrillExecutionCreateWithoutTrainingSessionInput = {
        drillTemplate: { connect: { id: template.id } },
        playerProfile: { connect: { id: playerProfileId } },
        startedAt: executionStartedAt,
        endedAt: executionEndedAt,
        attempts: attemptCount,
        successes,
        score,
        maxRun: maxSuccessRun(attempts),
        averageScore: Math.round((score / 10) * 10) / 10,
        resultJson: executionResultJson(template, attemptCount, successes, partials, errorTags, sessionIndex),
        errorTags,
        coachNotes: coachNote(template, successes, attemptCount, sessionIndex),
        playerNotes: playerNote(template, sessionIndex),
        attemptsLog: { create: attempts },
      };

      if (template.defaultTableLayoutJson !== null) {
        executionData.tableLayoutSnapshotJson = template.defaultTableLayoutJson as Prisma.InputJsonValue;
      }

      drillExecutions.push(executionData);
    }

    const session = await prisma.trainingSession.create({
      data: {
        playerProfile: { connect: { id: playerProfileId } },
        createdBy: { connect: { id: userId } },
        startedAt,
        endedAt,
        sessionType,
        title: `${pick(titles, sessionIndex)} #${sessionIndex + 1}`,
        goal: pick(goals, sessionIndex),
        intensity: clampInt(5 + (sessionIndex % 5), 1, 10),
        fatigueBefore: clampInt(2 + (sessionIndex % 6), 1, 10),
        fatigueAfter: clampInt(4 + (sessionIndex % 6), 1, 10),
        focusLevel: clampInt(6 + (sessionIndex % 4), 1, 10),
        mood: pick(['focused', 'steady', 'competitive', 'tired but disciplined', 'sharp'], sessionIndex),
        notes: sessionNote(sessionType, sessionIndex),
        drillExecutions: { create: drillExecutions },
      },
      select: { id: true, title: true, startedAt: true, endedAt: true },
    });

    summaries.push(session);
    calendarRows.push({
      playerProfileId,
      createdByUserId: userId,
      eventType: CalendarEventType.TRAINING,
      title: session.title,
      description: `Calendar mirror for ${session.title}.`,
      startAt: startedAt,
      endAt: endedAt,
      source: CalendarEventSource.MANUAL,
      metadataJson: { sessionId: session.id, sessionType } as Prisma.InputJsonValue,
    });
  }

  return summaries;
}

async function seedMatches(
  playerProfileId: string,
  userId: string,
  anchorDate: Date,
  calendarRows: Prisma.CalendarEventCreateManyInput[],
): Promise<MatchSeedSummary[]> {
  const matchPlans = [
    ['Adam Nowak', 'Warsaw Junior Series', -108, 3, 1, 48],
    ['Marek Zielinski', 'Academy League', -96, 2, 3, 31],
    ['Oskar Lewandowski', 'Club Championship', -88, 4, 2, 57],
    ['Piotr Wisniewski', 'Academy League', -79, 3, 0, 42],
    ['Jan Kowalski', 'Regional Ranking Qualifier', -72, 2, 4, 52],
    ['Leon Schmidt', 'Friendly Matchplay', -64, 5, 4, 68],
    ['Tomasz Wozniak', 'Academy League', -56, 1, 3, 29],
    ['Kacper Kaminski', 'Regional Junior Open', -49, 4, 3, 76],
    ['Filip Mazur', 'Club Championship', -41, 3, 2, 44],
    ['Daniel Weber', 'Friendly Matchplay', -35, 2, 2, 38],
    ['Mateusz Krawczyk', 'Academy League', -28, 4, 1, 61],
    ['Igor Pawlak', 'Regional Ranking Qualifier', -21, 2, 3, 47],
    ['Nikolai Petrov', 'International Junior Sparring', -15, 5, 2, 83],
    ['Hubert Grabowski', 'Club Championship', -9, 3, 1, 55],
    ['Alex Meyer', 'Academy League', -4, 4, 3, 72],
    ['Jakub Sokol', 'Practice Match', -1, 6, 4, 91],
  ] as const;

  const summaries: MatchSeedSummary[] = [];

  for (let matchIndex = 0; matchIndex < matchPlans.length; matchIndex += 1) {
    const plan = matchPlans[matchIndex];
    if (!plan) throw new Error('Match plan was not found.');
    const [opponentName, tournament, dayOffset, framesWon, framesLost, highBreak] = plan;
    const matchDate = atDayOffset(anchorDate, dayOffset, 13 + (matchIndex % 5), (matchIndex * 7) % 45);
    const totalFrames = framesWon + framesLost;
    const frameRows = buildFrames(matchIndex, framesWon, framesLost, highBreak);
    const result = framesWon > framesLost ? MatchResult.PLAYER_WIN : framesWon < framesLost ? MatchResult.OPPONENT_WIN : MatchResult.DRAW;
    const match = await prisma.match.create({
      data: {
        playerProfile: { connect: { id: playerProfileId } },
        createdBy: { connect: { id: userId } },
        matchDate,
        tournament,
        country: matchIndex === 12 ? 'Germany' : 'Poland',
        city: pick(['Warsaw', 'Krakow', 'Poznan', 'Gdansk', 'Berlin'], matchIndex),
        club: pick(['Green Baize Academy', '147 Club', 'CueLab Arena', 'Central Snooker Hall'], matchIndex),
        opponentName,
        opponentExternalId: `demo-opponent-${String(matchIndex + 1).padStart(2, '0')}`,
        round: pick(['Group', 'Quarter-final', 'Semi-final', 'Final', 'Friendly'], matchIndex),
        format: `Best of ${totalFrames % 2 === 0 ? totalFrames : totalFrames + 2}`,
        framesWon,
        framesLost,
        highBreak,
        breaks50: highBreak >= 50 ? 1 + (matchIndex % 2) : 0,
        breaks70: highBreak >= 70 ? 1 : 0,
        breaks100: 0,
        decidingFrameResult: Math.abs(framesWon - framesLost) === 1 ? (framesWon > framesLost ? FrameWinner.PLAYER : FrameWinner.OPPONENT) : null,
        safetySuccess: Math.round((52 + matchIndex * 2.4 + (framesWon > framesLost ? 8 : -3)) * 10) / 10,
        longPotSuccess: Math.round((38 + matchIndex * 1.7 + (highBreak > 60 ? 6 : 0)) * 10) / 10,
        unforcedErrors: 8 + ((matchIndex * 3) % 11) - (framesWon > framesLost ? 2 : 0),
        tacticalErrors: 3 + (matchIndex % 5),
        result,
        source: MatchSource.MANUAL,
        videoUrl: matchIndex % 3 === 0 ? `https://example.com/demo/matches/${matchIndex + 1}` : null,
        notes: matchNote(result, highBreak, matchIndex),
        frames: { create: frameRows },
      },
      select: { id: true, opponentName: true, matchDate: true, tournament: true, framesWon: true, framesLost: true },
    });

    summaries.push(match);
    calendarRows.push({
      playerProfileId,
      createdByUserId: userId,
      eventType: CalendarEventType.MATCH,
      title: `${tournament}: vs ${opponentName}`,
      description: `Match logged ${framesWon}-${framesLost}. High break ${highBreak}.`,
      startAt: matchDate,
      endAt: addMinutes(matchDate, 95 + totalFrames * 18),
      source: CalendarEventSource.MANUAL,
      metadataJson: { matchId: match.id, framesWon, framesLost, highBreak } as Prisma.InputJsonValue,
    });
  }

  return summaries;
}

function addCalendarTimelineEvents(
  rows: Prisma.CalendarEventCreateManyInput[],
  playerProfileId: string,
  userId: string,
  anchorDate: Date,
  trainingSummaries: TrainingSessionSeedSummary[],
  matchSummaries: MatchSeedSummary[],
  supplementSummaries: SupplementSeedSummary[],
): void {
  const fixedEvents: Prisma.CalendarEventCreateManyInput[] = [
    eventRow(playerProfileId, userId, CalendarEventType.EQUIPMENT_CHANGE, 'Changed to Century G3 tip', -120, 18, 'Two-week adaptation period started.', {
      equipment: 'Peradon Crown / Century G3',
    }),
    eventRow(playerProfileId, userId, CalendarEventType.EQUIPMENT_CHANGE, 'Switched to John Parris custom cue', -45, 17, 'Current cue setup started.', {
      equipment: 'John Parris Classic custom fit',
    }),
    eventRow(playerProfileId, userId, CalendarEventType.COACH_CHANGE, 'Added tactical review block with coach Elena', -83, 16, 'Weekly safety review added to training plan.', {
      coach: 'Elena Morozova',
    }),
    eventRow(playerProfileId, userId, CalendarEventType.TRAVEL, 'Travel to Krakow tournament', -50, 8, 'Morning train, late arrival and reduced sleep.', { city: 'Krakow' }, 2100),
    eventRow(playerProfileId, userId, CalendarEventType.TRAVEL, 'Travel to Berlin sparring weekend', -16, 7, 'International junior sparring block.', { city: 'Berlin' }, 2880),
    eventRow(playerProfileId, userId, CalendarEventType.REST_DAY, 'Full rest after ranking qualifier', -70, 10, 'No table work, mobility and school catch-up.', { reason: 'recovery' }),
    eventRow(playerProfileId, userId, CalendarEventType.REST_DAY, 'Low-load recovery Sunday', -30, 11, 'Short walk and video review only.', { reason: 'load management' }),
    eventRow(playerProfileId, userId, CalendarEventType.ILLNESS, 'Mild cold symptoms', -74, 8, 'Training reduced for three days.', { severity: 'mild' }, 4320),
    eventRow(playerProfileId, userId, CalendarEventType.INJURY, 'Right shoulder tightness', -49, 15, 'No heavy volume; technique work only.', { area: 'right shoulder', severity: 'minor' }, 5760),
    eventRow(playerProfileId, userId, CalendarEventType.SLEEP_ISSUE, 'Poor sleep before travel', -51, 7, 'Logged because match focus dipped in first session.', { sleepHours: 5.6 }),
    eventRow(playerProfileId, userId, CalendarEventType.SCHOOL_WORKLOAD, 'Exam week workload spike', -26, 9, 'Evening practice shortened to avoid fatigue overload.', { exams: 3 }, 4320),
    eventRow(playerProfileId, userId, CalendarEventType.CUSTOM_FACTOR, 'New pre-shot breathing cue', -18, 12, 'Started using one-breath reset before pressure drills.', {
      routine: 'one-breath reset',
    }),
  ];

  rows.push(...fixedEvents);

  for (let index = 0; index < supplementSummaries.length; index += 1) {
    const supplement = pick(supplementSummaries, index);
    rows.push({
      playerProfileId,
      createdByUserId: userId,
      eventType: CalendarEventType.SUPPLEMENT_START,
      title: `Started ${supplement.name}`,
      description: 'Supplement or routine period logged as historical context only.',
      startAt: supplement.startDate,
      endAt: null,
      source: CalendarEventSource.MANUAL,
      metadataJson: { supplementName: supplement.name, index } as Prisma.InputJsonValue,
    });
    if (supplement.endDate) {
      rows.push({
        playerProfileId,
        createdByUserId: userId,
        eventType: CalendarEventType.SUPPLEMENT_END,
        title: `Ended ${supplement.name}`,
        description: 'End of tracked supplement or routine period.',
        startAt: supplement.endDate,
        endAt: null,
        source: CalendarEventSource.MANUAL,
        metadataJson: { supplementName: supplement.name, index } as Prisma.InputJsonValue,
      });
    }
  }

  for (let index = 0; index < 18; index += 1) {
    const relatedSession = pick(trainingSummaries, index * 3);
    rows.push({
      playerProfileId,
      createdByUserId: userId,
      eventType: CalendarEventType.CUSTOM_FACTOR,
      title: `Coach review marker ${index + 1}`,
      description: `Follow-up note linked to ${relatedSession.title}.`,
      startAt: addMinutes(relatedSession.startedAt, 180),
      endAt: null,
      source: CalendarEventSource.MANUAL,
      metadataJson: { sessionId: relatedSession.id, reviewType: pick(['video', 'stats', 'routine', 'safety'], index) } as Prisma.InputJsonValue,
    });
  }

  for (let index = 0; index < 8; index += 1) {
    const relatedMatch = pick(matchSummaries, index * 2);
    rows.push({
      playerProfileId,
      createdByUserId: userId,
      eventType: CalendarEventType.TOURNAMENT,
      title: `Tournament context: ${relatedMatch.tournament}`,
      description: `Tournament block around match vs ${relatedMatch.opponentName}.`,
      startAt: addMinutes(relatedMatch.matchDate, -240),
      endAt: addMinutes(relatedMatch.matchDate, 300),
      source: CalendarEventSource.MANUAL,
      metadataJson: { matchId: relatedMatch.id, frames: `${relatedMatch.framesWon}-${relatedMatch.framesLost}` } as Prisma.InputJsonValue,
    });
  }
}

async function seedAiReports(
  playerProfileId: string,
  userId: string,
  anchorDate: Date,
  counts: {
    trainingSessions: number;
    matches: number;
    calendarEvents: number;
    lifestyleFactors: number;
    supplementEvents: number;
  },
): Promise<number> {
  let createdReports = 0;

  for (let weekIndex = 0; weekIndex < 8; weekIndex += 1) {
    const periodStart = atDayOffset(anchorDate, -7 * (weekIndex + 1), 0, 0);
    const periodEnd = atDayOffset(anchorDate, -7 * weekIndex - 1, 23, 59);
    const sourceData = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      snapshot: {
        sessions: Math.max(3, Math.round(counts.trainingSessions / 12) + (weekIndex % 3)),
        matches: weekIndex % 2 === 0 ? 2 : 1,
        drillExecutions: 9 + weekIndex,
        lifestyleRecords: 7,
        supplementPeriods: counts.supplementEvents,
      },
      trend: weekIndex < 3 ? 'long-pot progress with pressure volatility' : 'base building and cue adaptation',
    } satisfies Prisma.InputJsonObject;
    const status = weekIndex === 6 ? AiReportStatus.FAILED : weekIndex === 7 ? AiReportStatus.QUEUED : AiReportStatus.COMPLETED;
    const dataSources = {
      trainingSessions: counts.trainingSessions,
      drillExecutions: counts.trainingSessions * 3,
      matches: counts.matches,
      calendarEvents: counts.calendarEvents,
      lifestyleFactors: counts.lifestyleFactors,
      supplementEvents: counts.supplementEvents,
      previousAiReports: weekIndex,
    } satisfies Prisma.InputJsonObject;
    const reportData: Prisma.AiReportCreateInput = {
      playerProfile: { connect: { id: playerProfileId } },
      requestedBy: { connect: { id: userId } },
      reportType: AiReportType.WEEKLY_SUMMARY,
      status,
      periodStart,
      periodEnd,
      locale: 'ru',
      sourceDataHash: createHash('sha256').update(JSON.stringify(sourceData)).digest('hex'),
      sourceDataJson: sourceData,
      dataSourcesJson: dataSources,
      promptVersion: 'seed-demo-weekly-summary-v1',
      provider: 'seed-demo',
      model: 'static-demo-v1',
    };

    if (status === AiReportStatus.COMPLETED) {
      reportData.title = `Demo weekly summary ${weekIndex + 1}`;
      reportData.contentMarkdown = weeklyReportMarkdown(weekIndex, sourceData.trend);
      reportData.completedAt = atDayOffset(anchorDate, -7 * weekIndex, 8, 30);
    }

    if (status === AiReportStatus.FAILED) {
      reportData.title = 'Demo failed weekly summary';
      reportData.errorMessage = 'Seeded failure state for UI testing.';
    }

    await prisma.aiReport.create({ data: reportData });
    createdReports += 1;
  }

  return createdReports;
}

async function collectTotals(playerProfileId: string): Promise<{
  trainingSessions: number;
  drillExecutions: number;
  drillAttempts: number;
  matches: number;
  calendarEvents: number;
  lifestyleFactors: number;
  supplementEvents: number;
}> {
  const [trainingSessions, drillExecutions, drillAttempts, matches, calendarEvents, lifestyleFactors, supplementEvents] = await Promise.all([
    prisma.trainingSession.count({ where: { playerProfileId } }),
    prisma.drillExecution.count({ where: { playerProfileId } }),
    prisma.drillAttempt.count({ where: { drillExecution: { playerProfileId } } }),
    prisma.match.count({ where: { playerProfileId } }),
    prisma.calendarEvent.count({ where: { playerProfileId } }),
    prisma.lifestyleFactor.count({ where: { playerProfileId } }),
    prisma.supplementEvent.count({ where: { playerProfileId } }),
  ]);

  return { trainingSessions, drillExecutions, drillAttempts, matches, calendarEvents, lifestyleFactors, supplementEvents };
}

function buildAttempts(
  sessionIndex: number,
  executionIndex: number,
  attemptCount: number,
  template: DrillTemplateSeedRef,
  executionStartedAt: Date,
): Prisma.DrillAttemptCreateWithoutDrillExecutionInput[] {
  const difficultyPenalty = difficultyPenaltyFor(template.difficulty);
  const categoryBonus = categoryBonusFor(template.category);
  const trendBonus = Math.min(0.18, sessionIndex * 0.003);
  const targetRate = clampNumber(0.44 + categoryBonus + trendBonus - difficultyPenalty + (executionIndex % 2) * 0.04, 0.22, 0.82);
  const rows: Prisma.DrillAttemptCreateWithoutDrillExecutionInput[] = [];

  for (let attemptIndex = 0; attemptIndex < attemptCount; attemptIndex += 1) {
    const roll = pseudoRandom(sessionIndex * 1009 + executionIndex * 137 + attemptIndex * 17);
    const result = attemptResult(roll, targetRate, attemptIndex, sessionIndex);
    const score = attemptScore(result, template.category, attemptIndex, sessionIndex);
    const errorTags = attemptErrorTags(result, template.category, attemptIndex, sessionIndex);
    rows.push({
      attemptNumber: attemptIndex + 1,
      result,
      score,
      potSuccess: result === DrillAttemptResult.SUCCESS || (result === DrillAttemptResult.PARTIAL && template.category !== DrillCategory.SAFETY),
      positionSuccess: result === DrillAttemptResult.SUCCESS || (result === DrillAttemptResult.PARTIAL && attemptIndex % 2 === 0),
      missType: result === DrillAttemptResult.MISS ? pick(['thick contact', 'thin contact', 'pace error', 'alignment drift'], attemptIndex + sessionIndex) : null,
      errorTags,
      shotTimeMs: 15000 + ((sessionIndex + attemptIndex * 9) % 18) * 850,
      notes: attemptNote(result, template.category, attemptIndex),
      createdAt: addMinutes(executionStartedAt, attemptIndex * 2),
    });
  }

  return rows;
}

function buildFrames(
  matchIndex: number,
  framesWon: number,
  framesLost: number,
  highBreak: number,
): Prisma.MatchFrameCreateWithoutMatchInput[] {
  const totalFrames = framesWon + framesLost;
  const rows: Prisma.MatchFrameCreateWithoutMatchInput[] = [];
  let remainingPlayer = framesWon;
  let remainingOpponent = framesLost;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    const playerFrame = shouldPlayerWinFrame(frameIndex, matchIndex, remainingPlayer, remainingOpponent);
    if (playerFrame) remainingPlayer -= 1;
    else remainingOpponent -= 1;

    const playerScore = playerFrame ? 62 + ((matchIndex + frameIndex) % 34) : 18 + ((matchIndex * 4 + frameIndex) % 38);
    const opponentScore = playerFrame ? 19 + ((matchIndex * 3 + frameIndex) % 37) : 58 + ((matchIndex + frameIndex * 5) % 36);

    rows.push({
      frameNumber: frameIndex + 1,
      playerScore,
      opponentScore,
      winner: playerFrame ? FrameWinner.PLAYER : FrameWinner.OPPONENT,
      highBreak: Math.max(12, Math.min(highBreak, Math.round(highBreak * (0.35 + pseudoRandom(matchIndex * 23 + frameIndex) * 0.65)))),
      frameDurationSec: 1100 + ((matchIndex + frameIndex * 11) % 25) * 55,
      notes: playerFrame ? 'Controlled visit after safety exchange.' : 'Lost position after first scoring chance.',
    });
  }

  return rows;
}

function shouldPlayerWinFrame(frameIndex: number, matchIndex: number, remainingPlayer: number, remainingOpponent: number): boolean {
  if (remainingPlayer <= 0) return false;
  if (remainingOpponent <= 0) return true;
  return (frameIndex + matchIndex) % 3 !== 1;
}

function executionResultJson(
  template: DrillTemplateSeedRef,
  attempts: number,
  successes: number,
  partials: number,
  errorTags: string[],
  sessionIndex: number,
): Prisma.InputJsonValue {
  return {
    version: 1,
    templateName: template.name,
    category: template.category,
    attempts,
    successes,
    partials,
    successRate: Math.round((successes / attempts) * 1000) / 10,
    mainErrorTags: errorTags,
    pressureContext: sessionIndex % 5 === 0,
    coachFocus: pick(['alignment', 'pace', 'decision quality', 'routine stability'], sessionIndex),
  } satisfies Prisma.InputJsonObject;
}

function metricsSchema(keys: string[]): Prisma.InputJsonValue {
  return {
    version: 1,
    metrics: keys.map((key) => ({
      key,
      label: key.replace(/_/g, ' '),
      type: key.includes('kept') ? 'boolean' : key.includes('time') ? 'time_ms' : 'number',
      required: ['attempts', 'pots', 'line_hits', 'break_points'].includes(key),
    })),
  } satisfies Prisma.InputJsonObject;
}

function simpleLayout(id: string, label: string): Prisma.InputJsonValue {
  return {
    id,
    tableSize: 'full-size',
    balls: [
      { id: 'white', color: 'white', x: 900, y: 1140, visible: true },
      { id: 'red-1', color: 'red', x: 2460, y: 620, visible: true },
      { id: 'black', color: 'black', x: 3245, y: 889, visible: true },
    ],
    targetZones: [{ id: 'customer-target-zone', type: 'circle', x: 2860, y: 800, radius: 190, label }],
    shotPaths: [{ id: 'customer-primary-line', from: { x: 900, y: 1140 }, to: { x: 2460, y: 620 }, label: 'Primary route' }],
    annotations: [{ id: 'customer-note', text: label, at: { x: 1240, y: 1320 } }],
  } satisfies Prisma.InputJsonObject;
}

function eventRow(
  playerProfileId: string,
  userId: string,
  eventType: CalendarEventType,
  title: string,
  dayOffset: number,
  hour: number,
  description: string,
  metadataJson: Prisma.InputJsonValue,
  durationMinutes = 90,
): Prisma.CalendarEventCreateManyInput {
  const startAt = atDayOffset(startOfUtcDay(new Date()), dayOffset, hour, 0);
  return {
    playerProfileId,
    createdByUserId: userId,
    eventType,
    title,
    description,
    startAt,
    endAt: addMinutes(startAt, durationMinutes),
    source: CalendarEventSource.MANUAL,
    metadataJson,
  };
}

function sessionTypeForIndex(index: number): TrainingSessionType {
  if (index % 9 === 0) return TrainingSessionType.REVIEW;
  if (index % 6 === 0) return TrainingSessionType.COACHED;
  if (index % 5 === 0) return TrainingSessionType.MATCH_PREP;
  return TrainingSessionType.SOLO;
}

function attemptResult(roll: number, targetRate: number, attemptIndex: number, sessionIndex: number): DrillAttemptResult {
  if ((attemptIndex + sessionIndex) % 37 === 0) return DrillAttemptResult.SKIPPED;
  if (roll < targetRate) return DrillAttemptResult.SUCCESS;
  if (roll < targetRate + 0.22) return DrillAttemptResult.PARTIAL;
  return DrillAttemptResult.MISS;
}

function attemptScore(result: DrillAttemptResult, category: DrillCategory, attemptIndex: number, sessionIndex: number): number {
  const base = category === DrillCategory.BREAK_BUILDING || category === DrillCategory.MATCH_SIMULATION ? 7 + (attemptIndex % 8) * 3 : 10;
  if (result === DrillAttemptResult.SUCCESS) return base + (sessionIndex % 7);
  if (result === DrillAttemptResult.PARTIAL) return Math.round(base * 0.45);
  return 0;
}

function attemptErrorTags(result: DrillAttemptResult, category: DrillCategory, attemptIndex: number, sessionIndex: number): string[] {
  if (result === DrillAttemptResult.SUCCESS) return [];
  const categoryTags: Record<DrillCategory, string[]> = {
    [DrillCategory.CUE_ACTION]: ['alignment', 'tempo', 'head movement'],
    [DrillCategory.POTTING]: ['aiming', 'delivery', 'thick contact'],
    [DrillCategory.POSITIONAL_PLAY]: ['pace control', 'side spin', 'wrong angle'],
    [DrillCategory.BREAK_BUILDING]: ['shot selection', 'position leak', 'pace control'],
    [DrillCategory.SAFETY]: ['object ball leak', 'cue ball pace', 'tactical choice'],
    [DrillCategory.SNOOKER_ESCAPE]: ['angle calculation', 'speed control', 'foul risk'],
    [DrillCategory.TACTICAL_PLAY]: ['risk choice', 'containment', 'cue ball control'],
    [DrillCategory.MATCH_SIMULATION]: ['decision error', 'routine break', 'execution error'],
    [DrillCategory.PRESSURE_TRAINING]: ['routine break', 'tension', 'rushed delivery'],
    [DrillCategory.MENTAL_ROUTINE]: ['routine break', 'breathing', 'shot clock'],
    [DrillCategory.CUSTOM]: ['customer note', 'execution error', 'pace control'],
  };
  const tags = categoryTags[category];
  return [pick(tags, attemptIndex + sessionIndex), pick(tags, attemptIndex * 2 + sessionIndex + 1)].filter(uniqueString);
}

function summarizeErrorTags(attempts: Prisma.DrillAttemptCreateWithoutDrillExecutionInput[]): string[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    for (const tag of extractErrorTags(attempt.errorTags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([tag]) => tag);
}

function maxSuccessRun(attempts: Prisma.DrillAttemptCreateWithoutDrillExecutionInput[]): number {
  let currentRun = 0;
  let bestRun = 0;
  for (const attempt of attempts) {
    if (attempt.result === DrillAttemptResult.SUCCESS) {
      currentRun += 1;
      bestRun = Math.max(bestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }
  return bestRun;
}

function coachNote(template: DrillTemplateSeedRef, successes: number, attempts: number, sessionIndex: number): string {
  const rate = Math.round((successes / attempts) * 100);
  return `${template.name}: ${rate}% success. ${pick(['Keep the pause longer before delivery.', 'Good correction after early misses.', 'Decision quality matters more than raw pot count.', 'Repeat this under a match score next time.'], sessionIndex)}`;
}

function playerNote(template: DrillTemplateSeedRef, sessionIndex: number): string {
  return `${template.category.toLowerCase()} felt ${pick(['stable', 'rushed', 'better after the third block', 'sensitive to cue pace', 'stronger than last week'], sessionIndex)}.`;
}

function sessionNote(sessionType: TrainingSessionType, sessionIndex: number): string {
  return `${sessionType.toLowerCase()} session seeded for customer profile testing. Main theme: ${pick(['long pots', 'break building', 'safety containment', 'pressure routine', 'cue action'], sessionIndex)}.`;
}

function matchNote(result: MatchResult, highBreak: number, matchIndex: number): string {
  const resultText = result === MatchResult.PLAYER_WIN ? 'Won with better second visits.' : result === MatchResult.OPPONENT_WIN ? 'Lost after safety errors.' : 'Even practice match with shared frames.';
  return `${resultText} High break ${highBreak}. ${pick(['Long pots improved after frame two.', 'Need calmer first safety exchange.', 'Good response after losing the opener.', 'Pressure routine held in the decider.'], matchIndex)}`;
}

function attemptNote(result: DrillAttemptResult, category: DrillCategory, attemptIndex: number): string {
  if (result === DrillAttemptResult.SUCCESS) return 'Clean execution and routine held.';
  if (result === DrillAttemptResult.PARTIAL) return `Partial ${category.toLowerCase()} outcome; useful recovery note.`;
  if (result === DrillAttemptResult.SKIPPED) return 'Skipped to reset setup and avoid logging a false attempt.';
  return `Miss logged for pattern review #${attemptIndex + 1}.`;
}

function lifestyleNote(dayOffset: number, travel: boolean, illness: boolean, injury: boolean): string {
  if (illness) return 'Reduced table volume because of mild cold symptoms.';
  if (injury) return 'Shoulder tightness; shorter sessions and more review work.';
  if (travel) return 'Travel context, useful when reviewing focus and fatigue.';
  if (dayOffset % 14 === 0) return 'Weekly check-in note for trend testing.';
  return 'Normal training day context.';
}

function weeklyReportMarkdown(weekIndex: number, trend: string): string {
  return [
    `## Demo weekly summary ${weekIndex + 1}`,
    '',
    `Trend: ${trend}.`,
    '',
    '- Confidence: medium, based on seeded training, match and lifestyle records for this period.',
    '- Main gain: stronger first-visit scoring when the pre-shot routine stayed consistent.',
    '- Main risk: safety quality dropped on high-fatigue or travel-adjacent days.',
    '- Next focus: keep long-pot volume steady and review tactical errors before adding more intensity.',
  ].join('\n');
}

function difficultyPenaltyFor(difficulty: DrillDifficulty): number {
  if (difficulty === DrillDifficulty.BEGINNER) return -0.08;
  if (difficulty === DrillDifficulty.INTERMEDIATE) return 0;
  if (difficulty === DrillDifficulty.ADVANCED) return 0.08;
  return 0.15;
}

function categoryBonusFor(category: DrillCategory): number {
  if (category === DrillCategory.CUE_ACTION) return 0.09;
  if (category === DrillCategory.PRESSURE_TRAINING || category === DrillCategory.SNOOKER_ESCAPE) return -0.04;
  if (category === DrillCategory.MATCH_SIMULATION || category === DrillCategory.BREAK_BUILDING) return -0.02;
  return 0;
}

function loadEnvironment(): void {
  const repoRoot = resolve(__dirname, '../../..');
  loadEnvFile(resolve(repoRoot, '.env'));
  loadEnvFile(resolve(__dirname, '../.env'));

  if (!process.env.DATABASE_URL) {
    const host = process.env.POSTGRES_HOST ?? 'localhost';
    const port = process.env.POSTGRES_PORT ?? '5433';
    const database = process.env.POSTGRES_DB ?? 'snooker_os';
    const user = process.env.POSTGRES_USER ?? 'snooker';
    const password = process.env.POSTGRES_PASSWORD ?? 'snooker_password';
    process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function atDayOffset(anchorDate: Date, dayOffset: number, hour = 0, minute = 0): Date {
  const date = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate(), hour, minute, 0, 0));
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function extractErrorTags(value: Prisma.DrillAttemptCreateWithoutDrillExecutionInput['errorTags']): string[] {
  if (Array.isArray(value)) return value;
  if (isStringArraySet(value)) return value.set;
  return [];
}

function isStringArraySet(value: unknown): value is { set: string[] } {
  if (typeof value !== 'object' || value === null) return false;
  const maybeSet = (value as { set?: unknown }).set;
  return Array.isArray(maybeSet) && maybeSet.every((item) => typeof item === 'string');
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pick<T>(items: readonly T[], index: number): T {
  const item = items[Math.abs(index) % items.length];
  if (item === undefined) throw new Error('Cannot pick from an empty list.');
  return item;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function uniqueString(value: string, index: number, array: string[]): boolean {
  return array.indexOf(value) === index;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });