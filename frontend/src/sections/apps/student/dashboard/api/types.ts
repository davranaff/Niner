export type DashboardModule = 'reading' | 'listening' | 'writing' | 'speaking';

export type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
};

export type DashboardStatsResponse = {
  predictedOverallBand: number | string;
  totalAttempts: number;
  minutesThisWeek: number;
  currentStreak: number;
};

export type DashboardActivityDayResponse = {
  date: string;
  attempts: number;
  totalSeconds: number;
  totalMinutes: number;
  intensity: number;
};

export type DashboardActivityResponse = {
  year: number;
  settings: {
    year: number;
    availableYears: number[];
    availableModules: DashboardModule[];
    selectedModules: DashboardModule[];
  };
  summary: {
    practiceDays: number;
    totalAttempts: number;
    totalMinutes: number;
  };
  days: DashboardActivityDayResponse[];
};

export type DashboardHistoryAttemptResponse = {
  id: number;
  title: string;
  testDate: string;
  testType: DashboardModule;
  bandScore: number | string;
  timeTakenSeconds: number | null;
};

export type DashboardQuickLinkResponse = {
  label: string;
  path: string;
  module: DashboardModule | null;
};

export type DashboardQuickLinksResponse = {
  items: DashboardQuickLinkResponse[];
};

export type DashboardStats = {
  estimatedOverallBand: number;
  totalAttempts: number;
  weeklyStudyMinutes: number;
  currentStreak: number;
};

export type DashboardActivityDay = {
  date: string;
  attempts: number;
  totalMinutes: number;
  intensity: number;
};

export type DashboardActivity = {
  year: number;
  availableYears: number[];
  availableModules: DashboardModule[];
  selectedModules: DashboardModule[];
  practiceDays: number;
  days: DashboardActivityDay[];
};

export type DashboardHistoryAttempt = {
  id: number;
  title: string;
  testDate: string;
  testType: DashboardModule;
  bandScore: number;
  timeTakenSeconds: number;
};

export type DashboardQuickLink = {
  label: string;
  path: string;
  module: DashboardModule | null;
};
