export type AdminExamKind = 'reading' | 'listening' | 'writing';

export type AdminExamSummary = {
  id: number;
  kind: AdminExamKind;
  userId: number;
  testId: number;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
};

export type AdminExamDetail = AdminExamSummary;

export type AdminWritingReviewPayload = {
  isChecked: boolean;
  corrections: string | null;
  score: number | null;
};

export type AdminWritingReviewFormValues = {
  examPartId: string;
  isChecked: boolean;
  corrections: string;
  score: string;
};
