export type AssignmentModule = 'reading' | 'listening' | 'writing' | 'speaking';
export type AssignmentStatus = 'recommended' | 'in_progress' | 'completed' | 'cancelled';
export type SkillGapStatus = 'open' | 'improving' | 'resolved';
export type AssignmentGeneratedTestStatus = 'idle' | 'queued' | 'processing' | 'ready' | 'failed';

export type AssignmentSkillGap = {
  id: number;
  module: AssignmentModule;
  skillKey: string;
  label: string;
  status: SkillGapStatus;
  severityScore: number;
  occurrences: number;
  lastSeenAt: string;
  details: Record<string, unknown>;
};

export type AssignmentAttempt = {
  id: number;
  status: 'submitted' | 'evaluated';
  responseText: string;
  score: number | null;
  feedback: string | null;
  details: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentGeneratedTest = {
  status: AssignmentGeneratedTestStatus;
  progressPercent: number;
  testId: number | null;
  requestedAt: string | null;
  startedAt: string | null;
  generatedAt: string | null;
  error: string | null;
};

export type AssignmentItem = {
  id: number;
  module: AssignmentModule;
  sourceExamKind: AssignmentModule;
  sourceExamId: number;
  taskType: string;
  title: string;
  instructions: string;
  payload: Record<string, unknown>;
  status: AssignmentStatus;
  recommendedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  attemptsCount: number;
  skillGap: AssignmentSkillGap | null;
  latestAttempt: AssignmentAttempt | null;
  generatedTest: AssignmentGeneratedTest;
};

export type AssignmentErrorItem = {
  id: number;
  module: AssignmentModule;
  examKind: AssignmentModule;
  examId: number;
  sourceKey: string;
  skillKey: string;
  skillLabel: string;
  title: string;
  prompt: string | null;
  expectedAnswer: string | null;
  userAnswer: string | null;
  severity: number;
  details: Record<string, unknown>;
  occurredAt: string;
};

export type AssignmentListResponse = {
  items: AssignmentItem[];
  count: number;
  limit: number;
  offset: number;
};

export type AssignmentDetailsResponse = {
  assignment: AssignmentItem;
  skillGap: AssignmentSkillGap | null;
  errorItems: AssignmentErrorItem[];
  attempts: AssignmentAttempt[];
};

export type AssignmentAttemptCreatePayload = {
  responseText: string;
  score?: number | null;
};

export type AssignmentAttemptCreateResponse = {
  assignment: AssignmentItem;
  attempt: AssignmentAttempt;
};

export type AssignmentGenerateTestResponse = {
  assignment: AssignmentItem;
};

export type AssignmentListParams = {
  limit?: number;
  offset?: number;
  module?: AssignmentModule;
  status?: AssignmentStatus;
};
