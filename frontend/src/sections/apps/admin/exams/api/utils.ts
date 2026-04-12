import type { AdminExamSummary, AdminWritingReviewFormValues } from './types';

export type AdminExamStatus = 'in_progress' | 'completed' | 'terminated';

export const ADMIN_EXAM_BATCH_SIZE = 12;

export function resolveAdminExamStatus(
  exam: Pick<AdminExamSummary, 'finishedAt' | 'finishReason'>
): AdminExamStatus {
  if (!exam.finishedAt) {
    return 'in_progress';
  }

  if (exam.finishReason === 'left' || exam.finishReason === 'time_is_up') {
    return 'terminated';
  }

  return 'completed';
}

export function toAdminWritingReviewPayload(values: AdminWritingReviewFormValues) {
  return {
    isChecked: values.isChecked,
    corrections: values.corrections.trim() || null,
    score: values.score.trim() ? Number(values.score) : null,
  };
}
