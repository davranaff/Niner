import axios from 'axios';
import { keepPreviousData } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';

import {
  createSpeakingExam,
  fetchExaminerDecision,
  fetchMySpeakingExams,
  fetchSpeakingDetail,
  fetchSpeakingList,
  fetchSpeakingSession,
  finalizeSpeakingExam,
  persistSpeakingSession,
  startSpeakingExam,
} from './speaking-requests';
import {
  SPEAKING_EXAMS_LOOKUP_LIMIT,
} from '../constants';
import {
  buildSpeakingListRequestParams,
  clearSpeakingActiveExam,
  toSpeakingExamPage,
  toSpeakingExamSummary,
  toSpeakingListPage,
} from './utils';
import type {
  SpeakingCreateExamPayload,
  SpeakingExaminerDecisionRequest,
  SpeakingFinalizePayload,
  SpeakingSessionPersistPayload,
  SpeakingStartFlowPayload,
} from './types';

const speakingQueryRoot = ['student-speaking'] as const;

export const speakingQueryKeys = {
  root: speakingQueryRoot,
  list: (loadedBatches: number, rowsPerPage: number) =>
    [...speakingQueryRoot, 'list', { loadedBatches, rowsPerPage }] as const,
  detail: (testId: number) => [...speakingQueryRoot, 'detail', testId] as const,
  exams: (limit: number) => [...speakingQueryRoot, 'exams', { limit }] as const,
  session: (examId: number) => [...speakingQueryRoot, 'session', examId] as const,
};

type UseSpeakingListQueryParams = {
  page: number;
  rowsPerPage: number;
};

type UseMySpeakingExamsQueryParams = {
  limit?: number;
  enabled?: boolean;
};

export function useSpeakingListQuery({ page, rowsPerPage }: UseSpeakingListQueryParams) {
  return useFetch(
    speakingQueryKeys.list(page, rowsPerPage),
    async () => {
      const response = await fetchSpeakingList(buildSpeakingListRequestParams(page, rowsPerPage));
      return toSpeakingListPage(response);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useSpeakingDetailQuery(testId: number, enabled = true) {
  return useFetch(
    speakingQueryKeys.detail(testId),
    async () => fetchSpeakingDetail(testId),
    { enabled: enabled && testId > 0 }
  );
}

export function useMySpeakingExamsQuery(params?: UseMySpeakingExamsQueryParams) {
  const limit = params?.limit ?? SPEAKING_EXAMS_LOOKUP_LIMIT;
  const enabled = params?.enabled ?? true;

  return useFetch(
    speakingQueryKeys.exams(limit),
    async () => {
      const response = await fetchMySpeakingExams({
        speakingOffset: 0,
        limit,
      });

      return toSpeakingExamPage(response.speaking);
    },
    { enabled }
  );
}

export function useSpeakingSessionQuery(examId: number, enabled = true) {
  return useFetch(
    speakingQueryKeys.session(examId),
    async () => fetchSpeakingSession(examId),
    { enabled: enabled && examId > 0 }
  );
}

export function useCreateSpeakingExamMutation() {
  return useMutate((payload: SpeakingCreateExamPayload) => createSpeakingExam(payload));
}

export function useStartSpeakingExamMutation() {
  return useMutate(async (examId: number) => {
    const response = await startSpeakingExam(examId);
    return toSpeakingExamSummary(response);
  });
}

export function useStartSpeakingFlowMutation() {
  return useMutate(async ({ testId, examId }: SpeakingStartFlowPayload) => {
    const createAndStartFreshExam = async () => {
      const createdExam = await createSpeakingExam({ testId });
      const startedExam = await startSpeakingExam(createdExam.id);
      return toSpeakingExamSummary(startedExam);
    };

    if (examId) {
      try {
        const response = await startSpeakingExam(examId);
        const started = toSpeakingExamSummary(response);
        if (started.status !== 'completed') {
          return started;
        }

        // Local storage can hold a stale exam id from an already completed attempt.
        clearSpeakingActiveExam(testId);
      } catch (error) {
        if (
          !axios.isAxiosError(error) ||
          !error.response ||
          ![403, 404].includes(error.response.status)
        ) {
          throw error;
        }

        clearSpeakingActiveExam(testId);
      }
    }

    return createAndStartFreshExam();
  });
}

export function usePersistSpeakingSessionMutation() {
  return useMutate(async ({ examId, payload }: { examId: number; payload: SpeakingSessionPersistPayload }) =>
    persistSpeakingSession(examId, payload)
  );
}

export function useExaminerDecisionMutation() {
  return useMutate(async ({ examId, payload }: { examId: number; payload: SpeakingExaminerDecisionRequest }) =>
    fetchExaminerDecision(examId, payload)
  );
}

export function useFinalizeSpeakingExamMutation() {
  return useMutate(async ({ examId, payload }: { examId: number; payload: SpeakingFinalizePayload }) =>
    finalizeSpeakingExam(examId, payload)
  );
}
