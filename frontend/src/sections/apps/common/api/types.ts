import type { Pagination } from 'src/hooks/api';
import type {
  ActiveIeltsModule,
  AttemptStatus,
  IeltsModule,
  MockActivity,
  MockAttempt,
  MockIntegrityEvent,
  MockPassage,
  MockQuestion,
  MockResult,
  MockStudent,
  MockTeacher,
  MockTeacherStudentAnalytics,
  MockTest,
  MockTestSection,
  MockWritingPrompt,
  MockWritingSubmission,
  ModuleBandMap,
} from 'src/_mock/ielts';

export type AppsListFilters = {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  difficulty?: string;
};

export type MyTestsFilters = {
  page: number;
  pageSize: number;
  search: string;
  module?: string;
  status?: string;
};

export type TeacherStudentsFilters = {
  page: number;
  pageSize: number;
  search: string;
  weakModule?: string;
  integrity?: string;
};

export type TestListItem = MockTest & {
  attemptsCount: number;
  bestBand: number | null;
  bestScore: number | null;
  status: AttemptStatus | 'not_started';
  lastAttemptId: string | null;
  inProgressAttemptId: string | null;
};

export type AttemptSummary = {
  attempt: MockAttempt;
  test: MockTest;
  student: MockStudent;
  result: MockResult | null;
};

export type StudentDashboardData = {
  student: MockStudent;
  estimatedOverallBand: number;
  moduleBands: ModuleBandMap;
  totalAttempts: number;
  completedTests: number;
  inProgressTests: number;
  weeklyStudyMinutes: number;
  currentStreak: number;
  recentActivity: MockActivity[];
  recommendedNextStep: string;
  strongestArea: ActiveIeltsModule;
  weakestArea: ActiveIeltsModule;
  recentAttempts: AttemptSummary[];
  activityHeatmap: Array<{ date: string; minutes: number }>;
  moduleCards: Array<{
    module: IeltsModule;
    availableTests: number;
    bestBand: number | null;
    status: AttemptStatus | 'not_started' | 'coming_soon';
  }>;
  planSnapshot: MockStudent['activePlan'];
};

export type TeacherDashboardData = {
  teacher: MockTeacher;
  totalStudents: number;
  activeStudents: number;
  averageOverallBand: number;
  averageModuleBands: ModuleBandMap;
  recentAttempts: AttemptSummary[];
  studentsAtRisk: MockTeacherStudentAnalytics[];
  topImprovers: MockTeacherStudentAnalytics[];
  integrityAlerts: MockIntegrityEvent[];
  completionStats: {
    completed: number;
    terminated: number;
    inProgress: number;
  };
};

export type TestDetailsData = {
  test: MockTest;
  sections: MockTestSection[];
  passages: MockPassage[];
  questions: MockQuestion[];
  writingPrompts: MockWritingPrompt[];
  lastAttempt: MockAttempt | null;
  lastResult: MockResult | null;
};

export type SessionData = TestDetailsData & {
  attempt: MockAttempt;
  writingSubmission: MockWritingSubmission | null;
};

export type StudentAttemptsListItem = {
  attempt: MockAttempt;
  test: MockTest;
  result: MockResult | null;
};

export type StudentProfileData = {
  student: MockStudent;
  estimatedOverallBand: number;
  moduleBands: ModuleBandMap;
  totalAttempts: number;
  studyStreak: number;
  weeklyStudyMinutes: number;
  recentAttempts: AttemptSummary[];
  achievements: string[];
};

export type TeacherStudentDetailsData = {
  student: MockStudent;
  analytics: MockTeacherStudentAnalytics;
  latestAttempts: AttemptSummary[];
  writingSubmissions: MockWritingSubmission[];
  integrityEvents: MockIntegrityEvent[];
};

export type TeacherAnalyticsData = {
  averageOverallBand: number;
  averageModuleBands: ModuleBandMap;
  weakAreas: Array<{ label: string; count: number }>;
  questionTypeIssues: Array<{ label: string; count: number }>;
  completionVsTermination: {
    completed: number;
    terminated: number;
  };
  atRiskStudents: MockTeacherStudentAnalytics[];
};

export type PaginatedTests = Pagination<TestListItem>;
export type PaginatedStudentAttempts = Pagination<StudentAttemptsListItem>;
export type PaginatedTeacherStudents = Pagination<MockTeacherStudentAnalytics>;
