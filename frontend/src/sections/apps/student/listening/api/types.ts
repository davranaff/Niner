import type { GeneratedTestOrigin } from 'src/sections/apps/common/module-test/generated-test-origin';

export type ListeningListRequestParams = {
  offset: number;
  limit: number;
};

export type ListeningMyExamsRequestParams = {
  listeningOffset: number;
  limit: number;
};

export type ListeningMyTestsRequestParams = {
  offset: number;
  limit: number;
  ordering: string;
  module: 'listening';
  testId?: number;
};

export type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  count?: number | null;
};

export type BackendListeningListItem = {
  id: number;
  title: string;
  voiceUrl: string | null;
  description: string;
  timeLimit: number;
  isActive: boolean;
  createdAt: string;
  attemptsCount: number;
  successfulAttemptsCount: number;
  failedAttemptsCount: number;
  origin: GeneratedTestOrigin | null;
};

export type ListeningListItem = {
  id: number;
  title: string;
  voiceUrl: string | null;
  description: string;
  timeLimit: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  attemptsCount: number;
  successfulAttemptsCount: number;
  failedAttemptsCount: number;
  origin: GeneratedTestOrigin | null;
};

export type ListeningListPage = {
  items: ListeningListItem[];
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type BackendListeningOption = {
  id: number;
  optionText: string;
  order: number;
};

export type BackendListeningQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: BackendListeningOption[];
};

export type BackendListeningAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type BackendListeningBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: BackendListeningAnswerSpec;
  questions: BackendListeningQuestion[];
  tableJson?: Record<string, unknown> | null;
};

export type BackendListeningPart = {
  id: number;
  title: string;
  order: number;
  partNumber: number;
  questionBlocks: BackendListeningBlock[];
  questionsCount: number;
};

export type BackendListeningTestDetail = {
  id: number;
  title: string;
  voiceUrl: string | null;
  audioUrl: string | null;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: BackendListeningPart[];
  origin: GeneratedTestOrigin | null;
};

export type ListeningQuestionOption = {
  id: number;
  optionText: string;
  order: number;
};

export type ListeningQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: ListeningQuestionOption[];
};

export type ListeningAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type ListeningBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: ListeningAnswerSpec;
  questions: ListeningQuestion[];
  tableJson?: Record<string, unknown> | null;
};

export type ListeningPart = {
  id: number;
  title: string;
  order: number;
  partNumber: number;
  questionBlocks: ListeningBlock[];
  questionsCount: number;
};

export type ListeningTestDetail = {
  id: number;
  title: string;
  voiceUrl: string | null;
  audioUrl: string | null;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: ListeningPart[];
  origin: GeneratedTestOrigin | null;
};

export type BackendExamPublic = {
  id: number;
  userId: number;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  testId: number;
  kind: 'reading' | 'listening' | 'writing';
};

export type ListeningExamStatus = 'not_started' | 'in_progress' | 'completed';

export type ListeningExamSummary = BackendExamPublic & {
  kind: 'listening';
  status: ListeningExamStatus;
};

export type BackendExamsMeResponse = {
  reading: BackendOffsetPage<BackendExamPublic>;
  listening: BackendOffsetPage<BackendExamPublic>;
  writing: BackendOffsetPage<BackendExamPublic>;
};

export type ListeningExamPage = BackendOffsetPage<ListeningExamSummary>;

export type ListeningCreateExamPayload = {
  testId: number;
};

export type ListeningStartFlowPayload = {
  testId: number;
  examId?: number | null;
};

export type ListeningSubmitAnswerInput = {
  id: number;
  value: string;
};

export type BackendListeningExamResultStatus = 'success' | 'failed' | 'in_progress';

export type BackendListeningExamResult = {
  result: BackendListeningExamResultStatus;
  score: number | null;
  correctAnswers: number | null;
  timeSpent: number | null;
};

export type BackendExamDraftOut = {
  savedItems: number;
  startedAt: string | null;
  updatedAt: string;
};

export type ListeningDraftAnswers = Record<string, string>;

export type ListeningQuestionWithContext = {
  partId: number;
  partTitle: string;
  partNumber: number;
  blockId: number;
  blockTitle: string;
  blockType: string;
  answerSpec: ListeningAnswerSpec;
  question: ListeningQuestion;
};

export type StudentAttemptStatus = 'in_progress' | 'completed' | 'terminated';

export type StudentAttemptFinishReason =
  | 'completed'
  | 'left'
  | 'time_is_up'
  | 'timeout'
  | 'tab_switch';

export type BackendListeningAttemptItem = {
  id: number;
  kind: 'listening';
  testId: number;
  testTitle: string;
  timeLimit: number;
  status: StudentAttemptStatus;
  finishReason: StudentAttemptFinishReason | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedBand: number | null;
};

export type BackendListeningAttemptPage = {
  items: BackendListeningAttemptItem[];
  count: number;
  limit: number;
  offset: number;
};

export type ListeningAttemptItem = {
  id: number;
  testId: number;
  testTitle: string;
  durationMinutes: number;
  status: StudentAttemptStatus;
  finishReason: StudentAttemptFinishReason | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedBand: number | null;
};

export type ListeningAttemptPage = {
  items: ListeningAttemptItem[];
  count: number;
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
