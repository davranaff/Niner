import { useFetch, useMutate } from 'src/hooks/api';

import {
  continueOverallExam,
  fetchOverallExamList,
  fetchOverallExamResult,
  fetchOverallExamState,
  startOverallExam,
} from './overall-requests';
import type { OverallExamStatus } from './types';

const overallQueryRoot = ['student-overall-exam'] as const;

export const overallQueryKeys = {
  root: overallQueryRoot,
  state: (overallId: number) => [...overallQueryRoot, 'state', overallId] as const,
  result: (overallId: number) => [...overallQueryRoot, 'result', overallId] as const,
  list: (status: OverallExamStatus | null, limit: number, offset: number, ordering: string) =>
    [...overallQueryRoot, 'list', { status, limit, offset, ordering }] as const,
};

export function useOverallExamStateQuery(
  overallId: number,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  return useFetch(
    overallQueryKeys.state(overallId),
    () => fetchOverallExamState(overallId),
    {
      enabled: (options?.enabled ?? true) && overallId > 0,
      refetchInterval: options?.refetchInterval,
    }
  );
}

export function useOverallExamResultQuery(overallId: number, enabled = true) {
  return useFetch(overallQueryKeys.result(overallId), () => fetchOverallExamResult(overallId), {
    enabled: enabled && overallId > 0,
  });
}

export function useOverallExamListQuery(params?: {
  status?: OverallExamStatus;
  limit?: number;
  offset?: number;
  ordering?: string;
}) {
  const status = params?.status ?? null;
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;
  const ordering = params?.ordering ?? '-updated_at';

  return useFetch(
    overallQueryKeys.list(status, limit, offset, ordering),
    () =>
      fetchOverallExamList({
        status: status ?? undefined,
        limit,
        offset,
        ordering,
      }),
    { enabled: true }
  );
}

export function useOverallExamStartMutation() {
  return useMutate((_payload: void) => startOverallExam());
}

export function useOverallExamContinueMutation() {
  return useMutate((overallId: number) => continueOverallExam(overallId));
}
