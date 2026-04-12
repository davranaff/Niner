export type OverallModule = 'listening' | 'reading' | 'writing';
export type OverallExamStatus = 'in_progress' | 'completed' | 'terminated';
export type OverallExamPhase = 'module' | 'break' | 'completed' | 'terminated';
export type OverallExamResultStatus = 'in_progress' | 'success' | 'failed';
export type OverallModuleAttemptStatus = 'not_started' | 'in_progress' | 'completed' | 'terminated';

export type BackendOverallModuleAttempt = {
  module: OverallModule;
  testId: number;
  testTitle: string;
  examId: number | null;
  status: OverallModuleAttemptStatus;
  finishReason: string | null;
  result: 'success' | 'failed' | 'in_progress' | null;
  score: number | null;
  correctAnswers: number | null;
  timeSpent: number | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type BackendOverallExamState = {
  id: number;
  userId: number;
  status: OverallExamStatus;
  phase: OverallExamPhase;
  currentModule: OverallModule | null;
  result: OverallExamResultStatus;
  breakStartedAt: string | null;
  breakDurationSeconds: number;
  breakRemainingSeconds: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  listeningTestId: number;
  readingTestId: number;
  writingTestId: number;
  listeningExamId: number | null;
  readingExamId: number | null;
  writingExamId: number | null;
  modules: BackendOverallModuleAttempt[];
  createdAt: string;
  updatedAt: string;
};

export type BackendOverallExamResult = {
  id: number;
  userId: number;
  status: OverallExamStatus;
  phase: OverallExamPhase;
  result: OverallExamResultStatus;
  overallBand: number | null;
  overallBandPending: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  modules: BackendOverallModuleAttempt[];
};

export type BackendOverallExamListItem = {
  id: number;
  status: OverallExamStatus;
  phase: OverallExamPhase;
  result: OverallExamResultStatus;
  currentModule: OverallModule | null;
  overallBand: number | null;
  overallBandPending: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  listeningTestId: number;
  readingTestId: number;
  writingTestId: number;
  listeningExamId: number | null;
  readingExamId: number | null;
  writingExamId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendOverallExamList = {
  items: BackendOverallExamListItem[];
  count: number;
  limit: number;
  offset: number;
};
