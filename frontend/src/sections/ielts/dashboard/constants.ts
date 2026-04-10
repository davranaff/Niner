// ----------------------------------------------------------------------

export const MOCK_STATS = {
  attempts: 12,
  band: '6.5',
  streak: 5,
  weekMinutes: 142,
  trendAttempts: 3,
} as const;

export type IeltsSkillKey = 'reading' | 'writing' | 'listening';

export const MOCK_SKILLS: { key: IeltsSkillKey; pct: number; color: string }[] = [
  { key: 'reading', pct: 72, color: 'primary.main' },
  { key: 'writing', pct: 58, color: 'info.main' },
  { key: 'listening', pct: 81, color: 'success.main' },
];

export const HEATMAP_WEEK_COUNT = 53;

export const HEATMAP_YEAR_OPTIONS = [2026, 2025, 2024, 2023, 2022] as const;
