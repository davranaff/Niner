import type { GeneratedTestOrigin } from 'src/sections/apps/common/module-test/generated-test-origin';

export type ReadingListRequestParams = {
  offset: number;
  limit: number;
};

export type ReadingMyExamsRequestParams = {
  readingOffset: number;
  limit: number;
};

export type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
};

export type BackendReadingListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
  createdAt: string;
  attemptsCount: number;
  successfulAttemptsCount: number;
  failedAttemptsCount: number;
  origin: GeneratedTestOrigin | null;
};

export type ReadingListItem = {
  id: number;
  title: string;
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

export type ReadingListPage = {
  items: ReadingListItem[];
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type BackendReadingOption = {
  id: number;
  optionText: string;
  isCorrect: boolean;
  order: number;
};

export type BackendReadingQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: BackendReadingOption[];
};

export type BackendReadingAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type BackendReadingBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: BackendReadingAnswerSpec;
  questions: BackendReadingQuestion[];
  questionHeading?: string | null;
  listOfHeadings?: string | null;
  tableJson?: Record<string, unknown> | null;
  flowChartCompletion?: string | null;
};

export type BackendReadingPart = {
  id: number;
  title: string;
  content: string;
  passageNumber: number;
  partNumber: number;
  questionBlocks: BackendReadingBlock[];
  questionsCount: number;
};

export type BackendReadingTestDetail = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: BackendReadingPart[];
  passages: BackendReadingPart[];
  origin: GeneratedTestOrigin | null;
};

export type ReadingQuestionOption = {
  id: number;
  optionText: string;
  order: number;
};

export type ReadingQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: ReadingQuestionOption[];
};

export type ReadingAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type ReadingBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: ReadingAnswerSpec;
  questions: ReadingQuestion[];
  questionHeading?: string | null;
  listOfHeadings?: string | null;
  tableJson?: Record<string, unknown> | null;
  flowChartCompletion?: string | null;
};

export type ReadingPart = {
  id: number;
  title: string;
  content: string;
  passageNumber: number;
  partNumber: number;
  questionBlocks: ReadingBlock[];
  questionsCount: number;
};

export type ReadingTestDetail = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: ReadingPart[];
  passages: ReadingPart[];
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

export type ReadingExamStatus = 'not_started' | 'in_progress' | 'completed';

export type ReadingExamSummary = BackendExamPublic & {
  kind: 'reading';
  status: ReadingExamStatus;
};

export type BackendExamsMeResponse = {
  reading: BackendOffsetPage<BackendExamPublic>;
  listening: BackendOffsetPage<BackendExamPublic>;
  writing: BackendOffsetPage<BackendExamPublic>;
};

export type ReadingExamPage = BackendOffsetPage<ReadingExamSummary>;

export type ReadingCreateExamPayload = {
  testId: number;
};

export type ReadingStartFlowPayload = {
  testId: number;
  examId?: number | null;
};

export type ReadingSubmitAnswerInput = {
  id: number;
  value: string;
};

export type BackendExamResultStatus = 'success' | 'failed' | 'in_progress';

export type BackendReadingSubmitResult = {
  result: BackendExamResultStatus;
  score: number | null;
  correctAnswers: number | null;
  timeSpent: number | null;
};

export type BackendExamDraftOut = {
  savedItems: number;
  startedAt: string | null;
  updatedAt: string;
};

export type ReadingDraftAnswers = Record<string, string>;

export type ReadingQuestionWithContext = {
  partId: number;
  partTitle: string;
  passageNumber: number;
  blockId: number;
  blockTitle: string;
  blockType: string;
  answerSpec: ReadingAnswerSpec;
  question: ReadingQuestion;
};

export type ReadingStoredResultAnswer = {
  id: number;
  questionId: number;
  questionNumber: number;
  prompt: string;
  questionType: string;
  partTitle: string;
  blockTitle: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export type ReadingStoredResult = {
  examId: number;
  testId: number;
  testTitle: string;
  testDescription: string;
  submittedAt: string;
  result: BackendExamResultStatus;
  finishReason: string | null;
  score: number | null;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number | null;
  answers?: ReadingStoredResultAnswer[];
};
