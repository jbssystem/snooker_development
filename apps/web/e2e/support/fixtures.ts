/**
 * Minimal-but-valid API response fixtures for mocked smoke tests.
 *
 * Goal: provide just enough shape so the client components render their
 * populated state (cards, tables, charts) without crashing on undefined.
 * Shapes mirror the zod schemas in `packages/shared/src/schemas`.
 *
 * Keep values small (1 item per list) — these tests check "does it render",
 * not data correctness.
 */

const ISO_NOW = '2026-06-01T10:00:00.000Z';
const ISO_LATER = '2026-12-31T23:59:59.000Z';

export const adminUser = {
  id: 'usr_admin_0000000000000000',
  email: 'admin@snooker.test',
  displayName: 'Test Admin',
  roles: ['PLAYER', 'SYSTEM_ADMIN'] as const,
};

export const authTokens = {
  accessToken: 'test-access-token',
  accessTokenExpiresAt: ISO_LATER,
};

export const dashboard = {
  period: { days: 7 },
  totals: { sessions: 3, attempts: 40, trainingMinutes: 180, successRate: 72 },
  matchSummary: {
    matches: 2,
    wins: 1,
    winRate: 50,
    framesWon: 6,
    framesLost: 5,
    highBreak: 87,
    breaks100: 0,
  },
  weeklyVolume: [
    { label: 'Mon', trainingMinutes: 60, successRate: 70 },
    { label: 'Tue', trainingMinutes: 45, successRate: 75 },
  ],
  drillProgress: [
    {
      drillTemplateId: 'drl_1',
      drillTemplateName: 'Long red',
      successes: 28,
      attempts: 40,
      successRate: 70,
      executions: 3,
      lastPracticedAt: ISO_NOW,
    },
  ],
  recentSessions: [
    {
      id: 'ses_1',
      title: 'Cue action',
      startedAt: ISO_NOW,
      successRate: 72,
      drillExecutions: 2,
      attempts: 20,
    },
  ],
};

export const playerProfile = {
  firstName: 'Mark',
  lastName: 'Selby',
  dateOfBirth: '1983-06-09',
  country: 'GB',
  dominantHand: 'RIGHT',
  level: 'pro',
  seasonGoal: 'Win the worlds',
  avatar: null,
};

export const equipment = [
  {
    id: 'eqp_1',
    cueName: 'Main cue',
    cueWeight: 18.5,
    tipBrand: 'Taom',
    tipSize: 9.5,
    chalk: 'V10',
    activeFrom: '2026-01-01',
    activeTo: null,
    tipChangeDate: '2026-01-01',
    extension: null,
    notes: null,
  },
];

export const drillTemplates = [
  {
    id: 'drl_1',
    name: 'Long red',
    category: 'potting',
    difficulty: 'intermediate',
    visibility: 'private',
    description: 'Pot long reds from baulk',
    goal: 'Improve long red %',
    rules: '10 sets of 5',
    successCriteria: '7/10 pots',
    tags: ['long', '30min'],
    metricsSchema: {
      metrics: [
        { key: 'attempts', label: 'Attempts', type: 'number', unit: '', required: false },
        { key: 'pots', label: 'Pots', type: 'number', unit: '', required: false },
      ],
    },
    tableLayout: { balls: [], zones: [], paths: [], annotations: {} },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

export const trainingSessions = [
  {
    id: 'ses_1',
    title: 'Cue action',
    startedAt: ISO_NOW,
    sessionType: 'solo',
    endedAt: null,
    goal: null,
    intensity: 8,
    fatigueBefore: 5,
    fatigueAfter: null,
    focusLevel: 7,
    mood: 'calm',
    drillExecutions: [],
  },
];

export const matches = [
  {
    id: 'mat_1',
    matchType: 'match',
    isLive: false,
    matchDate: '2026-05-20',
    opponentName: 'John Higgins',
    framesWon: 3,
    framesLost: 2,
    result: 'player_win',
    tournament: 'Liga',
    round: 'SF',
    format: 'BO5',
    country: 'GB',
    city: 'Sheffield',
    club: 'Crucible',
    highBreak: 87,
    breaks50: 2,
    breaks70: 1,
    breaks100: 0,
    safetySuccess: 75,
    longPotSuccess: 60,
    unforcedErrors: 2,
    tacticalErrors: 1,
    sourceUrl: null,
    videoUrl: null,
    notes: null,
    frames: [],
  },
];

export const aiReports = [
  {
    id: 'rep_1',
    title: 'Weekly summary',
    status: 'completed',
    periodStart: '2026-05-19',
    periodEnd: '2026-05-25',
    provider: 'claude',
    model: 'opus',
    promptVersion: 1,
    sourceDataHash: 'abc123def456',
    dataSources: {
      trainingSessions: 3,
      drillExecutions: 6,
      matches: 2,
      calendarEvents: 1,
      lifestyleFactors: 1,
      supplementEvents: 0,
      previousReports: 0,
      externalImports: 0,
    },
    reportType: 'default',
    sourceData: null,
    contentMarkdown: '## Summary\nGood week.',
    errorMessage: null,
    createdAt: ISO_NOW,
  },
];

export const calendarEvents = [
  {
    id: 'cal_1',
    eventType: 'training',
    title: 'Morning practice',
    startAt: '2026-06-01T08:00:00.000Z',
    endAt: null,
    description: null,
    source: 'manual',
  },
];

export const lifestyleFactors = [
  {
    id: 'lif_1',
    date: '2026-06-01',
    sleepHours: 7,
    sleepQuality: 8,
    fatigue: 4,
    stress: 3,
    focus: 8,
    mood: null,
    illness: false,
    injury: false,
    travel: false,
    notes: null,
  },
];

export const supplementEvents = [
  {
    id: 'sup_1',
    name: 'Vitamin D',
    category: 'Vitamins',
    startDate: '2026-06-01',
    endDate: null,
    dosageNote: null,
    reason: null,
    notes: null,
  },
];

export const externalLinks = [
  {
    id: 'ext_1',
    source: 'cuetracker',
    externalId: '123',
    displayName: 'John Doe',
    lastSyncedAt: null,
  },
];

export const importedMatches = [
  {
    id: 'imp_1',
    source: 'cuetracker',
    matchDate: '2026-05-01',
    tournament: 'Open',
    opponentName: 'Opponent',
    framesWon: 3,
    framesLost: 2,
    highBreak: 80,
    result: 'player_win',
    round: null,
    format: null,
    breaks50: 1,
    breaks70: 0,
    breaks100: 0,
    decidingFrameResult: null,
    sourceUrl: null,
    notes: null,
    frames: [],
  },
];

export const activeAnnouncements = [
  {
    id: 'ann_1',
    type: 'announcement',
    severity: 'info',
    title: 'Welcome',
    bodyMarkdown: 'New season starts now.',
    version: null,
    dismissible: true,
  },
];

export const adminAnnouncements = [
  {
    id: 'ann_1',
    type: 'announcement',
    severity: 'info',
    title: 'Welcome',
    bodyMarkdown: 'New season starts now.',
    version: null,
    dismissible: true,
    isPublished: true,
    createdAt: ISO_NOW,
  },
];

export const adminStats = {
  totalUsers: 100,
  totalAdmins: 2,
  totalReports: 50,
  tokensThisMonth: 50_000,
  usersByStatus: { ACTIVE: 80, PENDING_VERIFICATION: 15, BLOCKED: 5 },
  recentSignups: [
    {
      id: 'usr_2',
      email: 'player@snooker.test',
      displayName: 'New Player',
      status: 'ACTIVE',
      createdAt: ISO_NOW,
    },
  ],
};

export const adminUserList = {
  items: [
    {
      id: 'usr_admin_0000000000000000',
      email: 'admin@snooker.test',
      displayName: 'Test Admin',
      status: 'ACTIVE',
      roles: ['SYSTEM_ADMIN'],
      emailVerifiedAt: ISO_NOW,
      blockedReason: null,
      createdAt: ISO_NOW,
      lastLoginAt: ISO_NOW,
      tokenUsage: { inputTokens: 600, outputTokens: 400, totalTokens: 1000, reportCount: 5 },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const adminDrills = [
  {
    id: 'drl_1',
    name: 'Straight cue',
    category: 'cue_action',
    difficulty: 'beginner',
    visibility: 'system',
    description: null,
    goal: 'Straight cueing',
    rules: 'Pot blue off spot',
    successCriteria: '8/10',
    tags: [],
    metricsSchema: { metrics: [] },
    tableLayout: { balls: [], zones: [], paths: [], annotations: {} },
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];
