import { useMutate, useFetch } from 'src/hooks/api';

import {
  fetchAssignmentDetails,
  fetchAssignments,
  generateAssignmentTest,
  submitAssignmentAttempt,
} from './assignment-requests';
import type { AssignmentDetailsResponse, AssignmentListParams, AssignmentListResponse } from './types';

export const assignmentQueryKeys = {
  root: ['student-assignments'] as const,
  list: (params: AssignmentListParams) => ['student-assignments', 'list', params] as const,
  details: (assignmentId: number) => ['student-assignments', 'details', assignmentId] as const,
};

export function useAssignmentsQuery(params: AssignmentListParams = {}) {
  return useFetch<AssignmentListResponse>(
    assignmentQueryKeys.list(params),
    () => fetchAssignments(params),
    {
      refetchInterval: ({ state: { data } }) =>
        data?.items?.some((item) =>
          ['queued', 'processing'].includes(item.generatedTest?.status ?? '')
        )
          ? 3000
          : false,
    }
  );
}

export function useAssignmentDetailsQuery(assignmentId: number, enabled = true) {
  return useFetch<AssignmentDetailsResponse>(
    assignmentQueryKeys.details(assignmentId),
    () => fetchAssignmentDetails(assignmentId),
    {
      enabled: enabled && assignmentId > 0,
      refetchInterval: (query) => {
        const status = query.state.data?.assignment?.generatedTest?.status;
        return status === 'queued' || status === 'processing' ? 3000 : false;
      },
    }
  );
}

export function useSubmitAssignmentAttemptMutation() {
  return useMutate(
    ({ assignmentId, ...payload }: { assignmentId: number; responseText: string; score?: number | null }) =>
      submitAssignmentAttempt(assignmentId, payload)
  );
}

export function useGenerateAssignmentTestMutation() {
  return useMutate(({ assignmentId }: { assignmentId: number }) => generateAssignmentTest(assignmentId));
}
