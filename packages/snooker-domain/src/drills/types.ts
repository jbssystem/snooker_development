import type { TableLayout } from '../table/types';

export type DrillCategory =
  | 'cue_action'
  | 'potting'
  | 'positional_play'
  | 'break_building'
  | 'safety'
  | 'snooker_escape'
  | 'tactical_play'
  | 'match_simulation'
  | 'pressure_training'
  | 'mental_routine'
  | 'custom';

export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export type DrillVisibility = 'private' | 'shared' | 'system';

export type DrillMetricType = 'number' | 'boolean' | 'percentage' | 'time_ms' | 'text';

export interface DrillMetric {
  key: string;
  label: string;
  type: DrillMetricType;
  unit?: string;
  min?: number;
  max?: number;
  required: boolean;
}

export interface DrillMetricsSchema {
  version: 1;
  metrics: DrillMetric[];
}

export interface DrillTemplate {
  id: string;
  name: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  description: string;
  goal: string;
  rules: string;
  successCriteria: string;
  metricsSchema: DrillMetricsSchema;
  defaultTableLayout?: TableLayout;
  tags: string[];
  visibility: DrillVisibility;
}
