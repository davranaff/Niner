import type {
  BackendReadingAnswerSpec,
  BackendReadingBlock,
  BackendReadingOption,
  BackendReadingPart,
  BackendReadingQuestion,
  BackendReadingTestDetail,
} from 'src/sections/apps/student/reading/api/types';

export type AdminReadingListItem = {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
};

export type AdminReadingTestSettings = AdminReadingListItem;

export type AdminReadingOption = {
  id: number;
  optionText: string;
  isCorrect: boolean;
  order: number;
};

export type AdminReadingQuestion = {
  id: number;
  questionText: string;
  order: number;
  number: number;
  answerType: string;
  inputVariant: string;
  options: AdminReadingOption[];
};

export type AdminReadingAnswerSpec = {
  answerType: string;
  inputVariant: string;
  optionsMode?: string | null;
  maxWords?: number | null;
};

export type AdminReadingBlock = {
  id: number;
  title: string;
  description: string;
  blockType: string;
  order: number;
  answerSpec: AdminReadingAnswerSpec;
  questions: AdminReadingQuestion[];
  questionHeading?: string | null;
  listOfHeadings?: string | null;
  tableJson?: Record<string, unknown> | null;
  flowChartCompletion?: string | null;
};

export type AdminReadingPassage = {
  id: number;
  title: string;
  content: string;
  passageNumber: number;
  partNumber: number;
  questionBlocks: AdminReadingBlock[];
  questionsCount: number;
};

export type AdminReadingDetail = AdminReadingTestSettings & {
  createdAt: string;
  passages: AdminReadingPassage[];
  parts: AdminReadingPassage[];
};

export type AdminReadingTestFormValues = {
  title: string;
  description: string;
  timeLimit: number;
  isActive: boolean;
};

export type AdminReadingPassageFormValues = {
  title: string;
  content: string;
  passageNumber: number;
};

export type AdminReadingBlockFormValues = {
  title: string;
  description: string;
  blockType: string;
  order: number;
  questionHeading: string;
  listOfHeadings: string;
  tableCompletion: string;
  flowChartCompletion: string;
};

export type AdminReadingQuestionFormValues = {
  questionText: string;
  order: number;
};

export type AdminReadingOptionFormValues = {
  optionText: string;
  isCorrect: boolean;
  order: number;
};

export type AdminReadingAnswerFormValues = {
  correctAnswers: string;
};

export type AdminReadingRawOption = BackendReadingOption;
export type AdminReadingRawQuestion = BackendReadingQuestion;
export type AdminReadingRawBlock = BackendReadingBlock;
export type AdminReadingRawPassage = BackendReadingPart;
export type AdminReadingRawDetail = BackendReadingTestDetail;
export type AdminReadingRawAnswerSpec = BackendReadingAnswerSpec;
