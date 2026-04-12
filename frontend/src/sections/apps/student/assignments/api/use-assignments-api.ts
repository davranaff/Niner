import { useMutate, useFetch } from 'src/hooks/api';

import {
  fetchAssignmentDetails,
  fetchAssignments,
  submitAssignmentAttempt,
} from './assignment-requests';
import type { AssignmentListParams } from './types';

export const assignmentQueryKeys = {
  root: ['student-assignments'] as const,
  list: (params: AssignmentListParams) => ['student-assignments', 'list', params] as const,
  details: (assignmentId: number) => ['student-assignments', 'details', assignmentId] as const,
};

export function useAssignmentsQuery(params: AssignmentListParams = {}) {
  return useFetch(assignmentQueryKeys.list(params), () => fetchAssignments(params));
}

export function useAssignmentDetailsQuery(assignmentId: number, enabled = true) {
  return useFetch(
    assignmentQueryKeys.details(assignmentId),
    () => fetchAssignmentDetails(assignmentId),
    { enabled: enabled && assignmentId > 0 }
  );
}

export function useSubmitAssignmentAttemptMutation() {
  return useMutate(
    ({ assignmentId, ...payload }: { assignmentId: number; responseText: string; score?: number | null }) =>
      submitAssignmentAttempt(assignmentId, payload)
  );
}
