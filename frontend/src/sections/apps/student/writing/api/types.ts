export type WritingListRequestParams = {
  offset: number;
  limit: number;
};

export type WritingMyExamsRequestParams = {
  writingOffset: number;
  limit: number;
};

export type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  count?: number | null;
};

export type BackendWritingListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
  createdAt: string;
};

export type WritingListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
};

export type WritingListPage = {
  items: WritingListItem[];
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type BackendWritingPromptAssets = {
  text: string;
  imageUrls: string[];
  fileUrls: string[];
};

export type BackendWritingAnswerSpec = {
  answerType: string;
  inputVariant: string;
};

export type BackendWritingPart = {
  id: number;
  order: number;
  testId: number;
  task: string;
  imageUrl?: string | null;
  fileUrls: string[];
  prompt: BackendWritingPromptAssets;
  answerSpec: BackendWritingAnswerSpec;
};

export type BackendWritingTestDetail = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: BackendWritingPart[];
  writingParts: BackendWritingPart[];
};

export type WritingPromptAssets = {
  text: string;
  imageUrls: string[];
  fileUrls: string[];
};

export type WritingAnswerSpec = {
  answerType: string;
  inputVariant: string;
};

export type WritingPart = {
  id: number;
  order: number;
  testId: number;
  task: string;
  imageUrl: string | null;
  fileUrls: string[];
  prompt: WritingPromptAssets;
  answerSpec: WritingAnswerSpec;
};

export type WritingTestDetail = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  createdAt: string;
  parts: WritingPart[];
  writingParts: WritingPart[];
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

export type WritingExamStatus = 'not_started' | 'in_progress' | 'completed';

export type WritingExamSummary = BackendExamPublic & {
  kind: 'writing';
  status: WritingExamStatus;
};

export type BackendExamsMeResponse = {
  reading: BackendOffsetPage<BackendExamPublic>;
  listening: BackendOffsetPage<BackendExamPublic>;
  writing: BackendOffsetPage<BackendExamPublic>;
};

export type WritingExamPage = BackendOffsetPage<WritingExamSummary>;

export type WritingCreateExamPayload = {
  testId: number;
};

export type WritingStartFlowPayload = {
  testId: number;
  examId?: number | null;
};

export type WritingSubmitPartInput = {
  partId: number;
  essay: string;
};

export type BackendWritingSubmitAnswer = {
  id: number;
  exam: number;
  part: number;
  essay: string | null;
  isChecked: boolean;
  corrections: string | null;
  score: number | null;
  wordCount: number;
};

export type BackendWritingSubmitResult = {
  answers: BackendWritingSubmitAnswer[];
  score: number | null;
  correctAnswers: number | null;
  timeSpent: number | null;
};

export type WritingDraftResponses = Record<string, string>;

export type WritingStoredResultAnswer = {
  id: number;
  examId: number;
  partId: number;
  order: number;
  taskLabel: string;
  promptText: string;
  essay: string;
  corrections: string | null;
  score: number | null;
  isChecked: boolean;
  wordCount: number;
};

export type WritingStoredResult = {
  examId: number;
  testId: number;
  testTitle: string;
  testDescription: string;
  submittedAt: string;
  finishReason: string | null;
  score: number | null;
  timeSpent: number | null;
  totalTasks: number;
  reviewedTasks: number;
  answers: WritingStoredResultAnswer[];
};
