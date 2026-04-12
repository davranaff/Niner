export type ProfileAttemptStatus = 'in_progress' | 'completed' | 'terminated';
export type ProfileModule = 'reading' | 'listening' | 'writing';

export type BackendProfileResponse = {
  id: number;
  userId: number;
  dateOfBirth: string | null;
  country: string;
  nativeLanguage: string;
  targetBandScore: number | string;
};

export type BackendDashboardStatsResponse = {
  predictedOverallBand: number | string;
  totalAttempts: number;
  minutesThisWeek: number;
  currentStreak: number;
};

export type BackendProfileAttemptItem = {
  id: number;
  kind: ProfileModule;
  testId: number;
  testTitle: string;
  status: ProfileAttemptStatus;
  finishReason: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedBand: number | null;
};

export type BackendProfileAttemptsPage = {
  items: BackendProfileAttemptItem[];
  count: number;
  limit: number;
  offset: number;
};

export type StudentProfileRecentAttempt = {
  id: number;
  module: ProfileModule;
  title: string;
  status: ProfileAttemptStatus;
  finishReason: string | null;
  estimatedBand: number | null;
  testDate: string;
};

export type StudentProfileData = {
  studentName: string;
  studentEmail: string;
  targetBand: number;
  estimatedOverallBand: number;
  totalAttempts: number;
  studyStreak: number;
  weeklyStudyMinutes: number;
  recentAttempts: StudentProfileRecentAttempt[];
};

