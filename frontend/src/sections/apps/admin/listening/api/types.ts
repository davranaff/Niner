import type {
  BackendListeningAnswerSpec,
  BackendListeningBlock,
  BackendListeningOption,
  BackendListeningPart,
  BackendListeningQuestion,
  BackendListeningTestDetail,
} from 'src/sections/apps/student/listening/api/types';

export type AdminListeningListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
  voiceUrl: string | null;
};

export type AdminListeningTestSettings = AdminListeningListItem;

export type AdminListeningOption = {
  id: number;
  optionText: string;
  order: number;
  isCorrect?: boolean | null;
};

export type AdminListeningQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: AdminListeningOption[];
};

export type AdminListeningAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type AdminListeningBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: AdminListeningAnswerSpec;
  questions: AdminListeningQuestion[];
  tableJson?: Record<string, unknown> | null;
};

export type AdminListeningPart = {
  id: number;
  title: string;
  order: number;
  partNumber: number;
  questionBlocks: AdminListeningBlock[];
  questionsCount: number;
};

export type AdminListeningDetail = AdminListeningTestSettings & {
  createdAt: string;
  parts: AdminListeningPart[];
  audioUrl: string | null;
};

export type AdminListeningTestFormValues = {
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
  voiceUrl: string;
};

export type AdminListeningPartFormValues = {
  title: string;
  order: number;
};

export type AdminListeningBlockFormValues = {
  title: string;
  description: string;
  blockType: string;
  order: number;
  tableCompletion: string;
};

export type AdminListeningQuestionFormValues = {
  questionText: string;
  order: number;
};

export type AdminListeningOptionFormValues = {
  optionText: string;
  isCorrect: boolean;
  order: number;
};

export type AdminListeningAnswerFormValues = {
  correctAnswers: string;
};

export type AdminListeningRawOption = BackendListeningOption;
export type AdminListeningRawQuestion = BackendListeningQuestion;
export type AdminListeningRawBlock = BackendListeningBlock;
export type AdminListeningRawPart = BackendListeningPart;
export type AdminListeningRawDetail = BackendListeningTestDetail;
export type AdminListeningRawAnswerSpec = BackendListeningAnswerSpec;
