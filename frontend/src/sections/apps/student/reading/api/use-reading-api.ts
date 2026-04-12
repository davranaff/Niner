import axios from 'axios';
import { keepPreviousData } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';

import {
  createReadingExam,
  fetchReadingExamResult,
  fetchMyReadingExams,
  fetchReadingDetail,
  fetchReadingList,
  saveReadingExamDraft,
  startReadingExam,
  submitReadingExam,
} from './reading-requests';
import {
  READING_EXAMS_LOOKUP_LIMIT,
  buildReadingListRequestParams,
  toReadingExamPage,
  toReadingExamSummary,
  toReadingListPage,
  toReadingTestDetail,
} from './utils';
import type {
  ReadingCreateExamPayload,
  ReadingStartFlowPayload,
  ReadingSubmitAnswerInput,
} from './types';

const readingQueryRoot = ['student-reading'] as const;

export const readingQueryKeys = {
  root: readingQueryRoot,
  /** `loadedBatches` — число подгруженных порций (URL `page`). */
  list: (loadedBatches: number, rowsPerPage: number) =>
    [...readingQueryRoot, 'list', { loadedBatches, rowsPerPage }] as const,
  detail: (testId: number) => [...readingQueryRoot, 'detail', testId] as const,
  exams: (limit: number) => [...readingQueryRoot, 'exams', { limit }] as const,
};

type UseReadingListQueryParams = {
  /** 1-based: сколько порций по `rowsPerPage` запросить за один вызов API (кумулятивно с offset 0). */
  page: number;
  rowsPerPage: number;
};

type UseMyReadingExamsQueryParams = {
  limit?: number;
  enabled?: boolean;
};

export function useReadingListQuery({ page, rowsPerPage }: UseReadingListQueryParams) {
  return useFetch(
    readingQueryKeys.list(page, rowsPerPage),
    async () => {
      const response = await fetchReadingList(buildReadingListRequestParams(page, rowsPerPage));

      return toReadingListPage(response);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useReadingDetailQuery(testId: number, enabled = true) {
  return useFetch(
    readingQueryKeys.detail(testId),
    async () => {
      const response = await fetchReadingDetail(testId);

      return toReadingTestDetail(response);
    },
    { enabled: enabled && testId > 0 }
  );
}

export function useMyReadingExamsQuery(params?: UseMyReadingExamsQueryParams) {
  const limit = params?.limit ?? READING_EXAMS_LOOKUP_LIMIT;
  const enabled = params?.enabled ?? true;

  return useFetch(
    readingQueryKeys.exams(limit),
    async () => {
      const response = await fetchMyReadingExams({
        readingOffset: 0,
        limit,
      });

      return toReadingExamPage(response.reading);
    },
    { enabled }
  );
}

export function useCreateReadingExamMutation() {
  return useMutate((payload: ReadingCreateExamPayload) => createReadingExam(payload));
}

export function useStartReadingExamMutation() {
  return useMutate(async (examId: number) => {
    const response = await startReadingExam(examId);

    return toReadingExamSummary(response);
  });
}

export function useStartReadingFlowMutation() {
  return useMutate(async ({ testId, examId }: ReadingStartFlowPayload) => {
    if (examId) {
      try {
        const response = await startReadingExam(examId);

        return toReadingExamSummary(response);
      } catch (error) {
        if (
          !axios.isAxiosError(error) ||
          !error.response ||
          ![403, 404].includes(error.response.status)
        ) {
          throw error;
        }
      }
    }

    const createdExam = await createReadingExam({ testId });
    const startedExam = await startReadingExam(createdExam.id);

    return toReadingExamSummary(startedExam);
  });
}

export function useSubmitReadingExamMutation() {
  return useMutate(
    async ({
      examId,
      answers,
      finishReason,
    }: {
      examId: number;
      answers: ReadingSubmitAnswerInput[];
      finishReason?: 'left' | 'time_is_up';
    }) => submitReadingExam(examId, answers, finishReason)
  );
}

export function useSaveReadingExamDraftMutation() {
  return useMutate(
    async ({
      examId,
      answers,
    }: {
      examId: number;
      answers: ReadingSubmitAnswerInput[];
    }) => saveReadingExamDraft(examId, answers)
  );
}

export function useReadingExamResultMutation() {
  return useMutate((examId: number) => fetchReadingExamResult(examId));
}
