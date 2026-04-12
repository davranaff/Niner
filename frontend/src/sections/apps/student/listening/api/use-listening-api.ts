import axios from 'axios';
import { keepPreviousData, type QueryKey } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';

import {
  createListeningExam,
  fetchListeningDetail,
  fetchListeningExamResult,
  fetchListeningList,
  fetchMyListeningExams,
  fetchMyListeningTests,
  saveListeningExamDraft,
  startListeningExam,
  submitListeningExam,
} from './listening-requests';
import {
  LISTENING_EXAMS_LOOKUP_LIMIT,
  buildListeningListRequestParams,
  buildListeningMyTestsRequestParams,
  toListeningAttemptPage,
  toListeningExamPage,
  toListeningExamSummary,
  toListeningListPage,
  toListeningTestDetail,
} from './utils';
import type {
  ListeningCreateExamPayload,
  ListeningStartFlowPayload,
  ListeningSubmitAnswerInput,
} from './types';

const listeningQueryRoot = ['student-listening'] as const;

export const listeningQueryKeys = {
  root: listeningQueryRoot,
  list: (loadedBatches: number, rowsPerPage: number) =>
    [...listeningQueryRoot, 'list', { loadedBatches, rowsPerPage }] as const,
  detail: (testId: number) => [...listeningQueryRoot, 'detail', testId] as const,
  exams: (limit: number) => [...listeningQueryRoot, 'exams', { limit }] as const,
  myTests: (testId: number, page: number, rowsPerPage: number) =>
    [...listeningQueryRoot, 'my-tests', { testId, page, rowsPerPage }] as const,
};

type UseListeningListQueryParams = {
  page: number;
  rowsPerPage: number;
};

type UseMyListeningExamsQueryParams = {
  limit?: number;
  enabled?: boolean;
};

type UseMyListeningTestsQueryParams = {
  testId: number;
  page: number;
  rowsPerPage: number;
  enabled?: boolean;
};

function parseMyTestsQueryKey(queryKey: QueryKey) {
  if (!Array.isArray(queryKey) || queryKey.length < 3) {
    return { testId: 0, page: 1, rowsPerPage: 10 };
  }

  const payload = queryKey[2] as { testId: number; page: number; rowsPerPage: number } | undefined;
  return {
    testId: payload?.testId ?? 0,
    page: payload?.page ?? 1,
    rowsPerPage: payload?.rowsPerPage ?? 10,
  };
}

export function useListeningListQuery({ page, rowsPerPage }: UseListeningListQueryParams) {
  return useFetch(
    listeningQueryKeys.list(page, rowsPerPage),
    async () => {
      const response = await fetchListeningList(buildListeningListRequestParams(page, rowsPerPage));
      return toListeningListPage(response);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useListeningDetailQuery(testId: number, enabled = true) {
  return useFetch(
    listeningQueryKeys.detail(testId),
    async () => {
      const response = await fetchListeningDetail(testId);
      return toListeningTestDetail(response);
    },
    { enabled: enabled && testId > 0 }
  );
}

export function useMyListeningExamsQuery(params?: UseMyListeningExamsQueryParams) {
  const limit = params?.limit ?? LISTENING_EXAMS_LOOKUP_LIMIT;
  const enabled = params?.enabled ?? true;

  return useFetch(
    listeningQueryKeys.exams(limit),
    async () => {
      const response = await fetchMyListeningExams({
        listeningOffset: 0,
        limit,
      });
      return toListeningExamPage(response.listening);
    },
    { enabled }
  );
}

export function useMyListeningTestsQuery(params: UseMyListeningTestsQueryParams) {
  const { testId, page, rowsPerPage, enabled = true } = params;
  const queryKey = listeningQueryKeys.myTests(testId, page, rowsPerPage);

  return useFetch(
    queryKey,
    async ({ queryKey: qk, signal }) => {
      const resolved = parseMyTestsQueryKey(qk);
      const response = await fetchMyListeningTests(
        buildListeningMyTestsRequestParams(
          resolved.page,
          resolved.rowsPerPage,
          resolved.testId > 0 ? resolved.testId : undefined
        ),
        signal
      );

      return toListeningAttemptPage(response);
    },
    { enabled: enabled && testId > 0, placeholderData: keepPreviousData }
  );
}

export function useCreateListeningExamMutation() {
  return useMutate((payload: ListeningCreateExamPayload) => createListeningExam(payload));
}

export function useStartListeningExamMutation() {
  return useMutate(async (examId: number) => {
    const response = await startListeningExam(examId);
    return toListeningExamSummary(response);
  });
}

export function useStartListeningFlowMutation() {
  return useMutate(async ({ testId, examId }: ListeningStartFlowPayload) => {
    if (examId) {
      try {
        const response = await startListeningExam(examId);
        return toListeningExamSummary(response);
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

    const createdExam = await createListeningExam({ testId });
    const startedExam = await startListeningExam(createdExam.id);
    return toListeningExamSummary(startedExam);
  });
}

export function useSubmitListeningExamMutation() {
  return useMutate(
    async ({
      examId,
      answers,
      finishReason,
    }: {
      examId: number;
      answers: ListeningSubmitAnswerInput[];
      finishReason?: 'left' | 'time_is_up';
    }) => submitListeningExam(examId, answers, finishReason)
  );
}

export function useSaveListeningExamDraftMutation() {
  return useMutate(
    async ({
      examId,
      answers,
    }: {
      examId: number;
      answers: ListeningSubmitAnswerInput[];
    }) => saveListeningExamDraft(examId, answers)
  );
}

export function useListeningExamResultMutation() {
  return useMutate((examId: number) => fetchListeningExamResult(examId));
}
