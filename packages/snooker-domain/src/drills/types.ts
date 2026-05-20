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

export interface DrillTemplate {
  id: string;
  name: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  description: string;
  goal: string;
  rules: string;
  successCriteria: string;
  tags: string[];
}
