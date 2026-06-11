import type { DashboardDrillProgress, DashboardWeeklyPoint, PlayerDashboard } from '@snooker/shared';

export type InsightTone = 'accent' | 'gold' | 'info' | 'warning';

export type InsightValues = Record<string, number | string>;

export type DashboardInsight = {
  actionKey: string;
  bodyKey: string;
  confidence: number;
  drillTemplateId?: string;
  drillTemplateName?: string;
  href: string;
  id: string;
  metricKey: string;
  metricValue: string;
  titleKey: string;
  tone: InsightTone;
  values?: InsightValues;
};

export function buildDashboardInsights(dashboard: PlayerDashboard): DashboardInsight[] {
  const insights: DashboardInsight[] = [
    buildMomentumInsight(dashboard),
    buildFocusInsight(dashboard.drillProgress),
    buildLoadInsight(dashboard),
    buildMatchTransferInsight(dashboard),
  ];

  return insights;
}

function buildMomentumInsight(dashboard: PlayerDashboard): DashboardInsight {
  const activeWeeks = dashboard.weeklyVolume.filter((point) => point.attempts > 0 || point.trainingMinutes > 0);
  const attempts = activeWeeks.reduce((sum, point) => sum + point.attempts, 0);

  if (activeWeeks.length < 2 || attempts < 8) {
    return {
      actionKey: 'startSignal',
      bodyKey: 'startSignal',
      confidence: confidenceFromSample(attempts, activeWeeks.length),
      href: '/training',
      id: 'start-signal',
      metricKey: 'sample',
      metricValue: String(attempts),
      titleKey: 'startSignal',
      tone: 'info',
      values: { attempts },
    };
  }

  const currentWindowSize = Math.min(3, Math.max(1, Math.ceil(activeWeeks.length / 2)));
  const currentWeeks = activeWeeks.slice(-currentWindowSize);
  const previousWeeks = activeWeeks.slice(0, -currentWindowSize);
  const currentRate = weightedSuccessRate(currentWeeks);
  const previousRate = previousWeeks.length > 0 ? weightedSuccessRate(previousWeeks) : dashboard.totals.successRate;
  const delta = Math.round(currentRate - previousRate);
  const confidence = confidenceFromSample(attempts, activeWeeks.length);

  if (delta >= 6) {
    return {
      actionKey: 'momentumUp',
      bodyKey: 'momentumUp',
      confidence,
      href: '/analytics',
      id: 'momentum-up',
      metricKey: 'trend',
      metricValue: signedPercent(delta),
      titleKey: 'momentumUp',
      tone: 'accent',
      values: { currentRate: Math.round(currentRate), delta },
    };
  }

  if (delta <= -6) {
    return {
      actionKey: 'momentumDown',
      bodyKey: 'momentumDown',
      confidence,
      href: '/training',
      id: 'momentum-down',
      metricKey: 'trend',
      metricValue: signedPercent(delta),
      titleKey: 'momentumDown',
      tone: 'warning',
      values: { currentRate: Math.round(currentRate), delta: Math.abs(delta) },
    };
  }

  return {
    actionKey: 'momentumStable',
    bodyKey: 'momentumStable',
    confidence,
    href: '/training',
    id: 'momentum-stable',
    metricKey: 'successRate',
    metricValue: `${Math.round(currentRate)}%`,
    titleKey: 'momentumStable',
    tone: 'info',
    values: { currentRate: Math.round(currentRate) },
  };
}

function buildFocusInsight(drills: DashboardDrillProgress[]): DashboardInsight {
  const measuredDrills = drills.filter((drill) => drill.attempts >= 5);

  if (measuredDrills.length === 0) {
    return {
      actionKey: 'drillCoverage',
      bodyKey: 'drillCoverage',
      confidence: 35,
      href: '/drills',
      id: 'drill-coverage',
      metricKey: 'drills',
      metricValue: String(drills.length),
      titleKey: 'drillCoverage',
      tone: 'info',
      values: { drills: drills.length },
    };
  }

  const firstMeasuredDrill = measuredDrills[0];
  if (!firstMeasuredDrill) {
    return {
      actionKey: 'drillCoverage',
      bodyKey: 'drillCoverage',
      confidence: 35,
      href: '/drills',
      id: 'drill-coverage',
      metricKey: 'drills',
      metricValue: String(drills.length),
      titleKey: 'drillCoverage',
      tone: 'info',
      values: { drills: drills.length },
    };
  }

  const hardestDrill = measuredDrills.reduce(
    (currentHardest, drill) => (drill.successRate < currentHardest.successRate ? drill : currentHardest),
    firstMeasuredDrill,
  );
  const strongestDrill = measuredDrills.reduce(
    (currentStrongest, drill) => (drill.successRate > currentStrongest.successRate ? drill : currentStrongest),
    firstMeasuredDrill,
  );

  if (hardestDrill.successRate < 58) {
    return {
      actionKey: 'focusDrill',
      bodyKey: 'focusDrill',
      confidence: confidenceFromSample(hardestDrill.attempts, hardestDrill.executions),
      drillTemplateId: hardestDrill.drillTemplateId,
      drillTemplateName: hardestDrill.drillTemplateName,
      href: '/training',
      id: 'focus-drill',
      metricKey: 'successRate',
      metricValue: `${Math.round(hardestDrill.successRate)}%`,
      titleKey: 'focusDrill',
      tone: 'warning',
      values: { attempts: hardestDrill.attempts },
    };
  }

  return {
    actionKey: 'strengthDrill',
    bodyKey: 'strengthDrill',
    confidence: confidenceFromSample(strongestDrill.attempts, strongestDrill.executions),
    drillTemplateId: strongestDrill.drillTemplateId,
    drillTemplateName: strongestDrill.drillTemplateName,
    href: '/training',
    id: 'strength-drill',
    metricKey: 'successRate',
    metricValue: `${Math.round(strongestDrill.successRate)}%`,
    titleKey: 'strengthDrill',
    tone: 'gold',
    values: { attempts: strongestDrill.attempts },
  };
}

function buildLoadInsight(dashboard: PlayerDashboard): DashboardInsight {
  const { totals } = dashboard;

  if (totals.openSessions > 0) {
    return {
      actionKey: 'openSessions',
      bodyKey: 'openSessions',
      confidence: 88,
      href: '/training',
      id: 'open-sessions',
      metricKey: 'openSessions',
      metricValue: String(totals.openSessions),
      titleKey: 'openSessions',
      tone: 'warning',
      values: { sessions: totals.openSessions },
    };
  }

  if (totals.sessions >= 3 && totals.trainingMinutes / totals.sessions < 25) {
    return {
      actionKey: 'shortSessions',
      bodyKey: 'shortSessions',
      confidence: 70,
      href: '/calendar',
      id: 'short-sessions',
      metricKey: 'minutesPerSession',
      metricValue: String(Math.round(totals.trainingMinutes / totals.sessions)),
      titleKey: 'shortSessions',
      tone: 'info',
      values: { minutes: Math.round(totals.trainingMinutes / totals.sessions) },
    };
  }

  if (totals.trainingMinutes >= 180 && totals.successRate < 50) {
    return {
      actionKey: 'heavyLoad',
      bodyKey: 'heavyLoad',
      confidence: 74,
      href: '/calendar',
      id: 'heavy-load',
      metricKey: 'trainingMinutes',
      metricValue: String(totals.trainingMinutes),
      titleKey: 'heavyLoad',
      tone: 'warning',
      values: { minutes: totals.trainingMinutes, successRate: Math.round(totals.successRate) },
    };
  }

  return {
    actionKey: 'rhythm',
    bodyKey: 'rhythm',
    confidence: confidenceFromSample(totals.attempts, totals.sessions),
    href: '/calendar',
    id: 'rhythm',
    metricKey: 'trainingMinutes',
    metricValue: String(totals.trainingMinutes),
    titleKey: 'rhythm',
    tone: 'accent',
    values: { sessions: totals.sessions, minutes: totals.trainingMinutes },
  };
}

function buildMatchTransferInsight(dashboard: PlayerDashboard): DashboardInsight {
  const { matchSummary, totals } = dashboard;

  if (matchSummary.matches === 0) {
    return {
      actionKey: 'addMatches',
      bodyKey: 'addMatches',
      confidence: 40,
      href: '/matches',
      id: 'add-matches',
      metricKey: 'matches',
      metricValue: '0',
      titleKey: 'addMatches',
      tone: 'info',
    };
  }

  if (totals.successRate >= 70 && matchSummary.winRate < 45) {
    return {
      actionKey: 'transferGap',
      bodyKey: 'transferGap',
      confidence: confidenceFromSample(totals.attempts, matchSummary.matches),
      href: '/matches',
      id: 'transfer-gap',
      metricKey: 'winRate',
      metricValue: `${Math.round(matchSummary.winRate)}%`,
      titleKey: 'transferGap',
      tone: 'warning',
      values: { successRate: Math.round(totals.successRate), winRate: Math.round(matchSummary.winRate) },
    };
  }

  if (totals.successRate >= 60 && matchSummary.winRate >= 60) {
    return {
      actionKey: 'matchValidation',
      bodyKey: 'matchValidation',
      confidence: confidenceFromSample(totals.attempts, matchSummary.matches),
      href: '/matches',
      id: 'match-validation',
      metricKey: 'winRate',
      metricValue: `${Math.round(matchSummary.winRate)}%`,
      titleKey: 'matchValidation',
      tone: 'gold',
      values: { winRate: Math.round(matchSummary.winRate), framesWon: matchSummary.framesWon },
    };
  }

  return {
    actionKey: 'matchLens',
    bodyKey: 'matchLens',
    confidence: confidenceFromSample(totals.attempts, matchSummary.matches),
    href: '/matches',
    id: 'match-lens',
    metricKey: 'frames',
    metricValue: `${matchSummary.framesWon}–${matchSummary.framesLost}`,
    titleKey: 'matchLens',
    tone: 'info',
    values: { framesWon: matchSummary.framesWon, framesLost: matchSummary.framesLost },
  };
}

function weightedSuccessRate(points: DashboardWeeklyPoint[]): number {
  const attempts = points.reduce((sum, point) => sum + point.attempts, 0);
  if (attempts === 0) return 0;
  const successes = points.reduce((sum, point) => sum + point.successes, 0);
  return (successes / attempts) * 100;
}

function confidenceFromSample(sampleSize: number, breadth: number): number {
  return Math.min(95, Math.round(35 + Math.min(sampleSize, 80) * 0.45 + Math.min(breadth, 8) * 3));
}

function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`;
}