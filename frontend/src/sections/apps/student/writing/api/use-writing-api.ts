import axios from 'axios';
import { keepPreviousData } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';

import {
  createWritingExam,
  fetchWritingExamResult,
  fetchMyWritingExams,
  fetchWritingDetail,
  fetchWritingList,
  saveWritingExamDraft,
  startWritingExam,
  submitWritingExam,
} from './writing-requests';
import {
  WRITING_EXAMS_LOOKUP_LIMIT,
  buildWritingListRequestParams,
  toWritingExamPage,
  toWritingExamSummary,
  toWritingListPage,
  toWritingTestDetail,
} from './utils';
import type {
  WritingCreateExamPayload,
  WritingStartFlowPayload,
  WritingSubmitPartInput,
} from './types';

const writingQueryRoot = ['student-writing'] as const;

export const writingQueryKeys = {
  root: writingQueryRoot,
  list: (loadedBatches: number, rowsPerPage: number) =>
    [...writingQueryRoot, 'list', { loadedBatches, rowsPerPage }] as const,
  detail: (testId: number) => [...writingQueryRoot, 'detail', testId] as const,
  exams: (limit: number) => [...writingQueryRoot, 'exams', { limit }] as const,
};

type UseWritingListQueryParams = {
  page: number;
  rowsPerPage: number;
};

type UseMyWritingExamsQueryParams = {
  limit?: number;
  enabled?: boolean;
};

export function useWritingListQuery({ page, rowsPerPage }: UseWritingListQueryParams) {
  return useFetch(
    writingQueryKeys.list(page, rowsPerPage),
    async () => {
      const response = await fetchWritingList(buildWritingListRequestParams(page, rowsPerPage));

      return toWritingListPage(response);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useWritingDetailQuery(testId: number, enabled = true) {
  return useFetch(
    writingQueryKeys.detail(testId),
    async () => {
      const response = await fetchWritingDetail(testId);

      return toWritingTestDetail(response);
    },
    { enabled: enabled && testId > 0 }
  );
}

export function useMyWritingExamsQuery(params?: UseMyWritingExamsQueryParams) {
  const limit = params?.limit ?? WRITING_EXAMS_LOOKUP_LIMIT;
  const enabled = params?.enabled ?? true;

  return useFetch(
    writingQueryKeys.exams(limit),
    async () => {
      const response = await fetchMyWritingExams({
        writingOffset: 0,
        limit,
      });

      return toWritingExamPage(response.writing);
    },
    { enabled }
  );
}

export function useCreateWritingExamMutation() {
  return useMutate((payload: WritingCreateExamPayload) => createWritingExam(payload));
}

export function useStartWritingExamMutation() {
  return useMutate(async (examId: number) => {
    const response = await startWritingExam(examId);

    return toWritingExamSummary(response);
  });
}

export function useStartWritingFlowMutation() {
  return useMutate(async ({ testId, examId }: WritingStartFlowPayload) => {
    if (examId) {
      try {
        const response = await startWritingExam(examId);

        return toWritingExamSummary(response);
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

    const createdExam = await createWritingExam({ testId });
    const startedExam = await startWritingExam(createdExam.id);

    return toWritingExamSummary(startedExam);
  });
}

export function useSubmitWritingExamMutation() {
  return useMutate(
    async ({
      examId,
      parts,
      finishReason,
    }: {
      examId: number;
      parts: WritingSubmitPartInput[];
      finishReason?: 'left' | 'time_is_up';
    }) => submitWritingExam(examId, parts, finishReason)
  );
}

export function useSaveWritingExamDraftMutation() {
  return useMutate(
    async ({
      examId,
      parts,
    }: {
      examId: number;
      parts: WritingSubmitPartInput[];
    }) => saveWritingExamDraft(examId, parts)
  );
}

export function useWritingExamResultMutation() {
  return useMutate((examId: number) => fetchWritingExamResult(examId));
}
