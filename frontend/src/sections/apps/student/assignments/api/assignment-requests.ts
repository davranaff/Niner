import { request } from 'src/utils/axios';

import type {
  AssignmentAttemptCreatePayload,
  AssignmentAttemptCreateResponse,
  AssignmentDetailsResponse,
  AssignmentListParams,
  AssignmentListResponse,
} from './types';

const assignmentUrls = {
  list: '/api/v1/assignments',
  details: (assignmentId: number) => `/api/v1/assignments/${assignmentId}`,
  attempts: (assignmentId: number) => `/api/v1/assignments/${assignmentId}/attempts`,
} as const;

export function fetchAssignments(params: AssignmentListParams = {}) {
  return request<AssignmentListResponse>({
    method: 'GET',
    url: assignmentUrls.list,
    params,
  });
}

export function fetchAssignmentDetails(assignmentId: number) {
  return request<AssignmentDetailsResponse>({
    method: 'GET',
    url: assignmentUrls.details(assignmentId),
  });
}

export function submitAssignmentAttempt(
  assignmentId: number,
  payload: AssignmentAttemptCreatePayload
) {
  return request<AssignmentAttemptCreateResponse>({
    method: 'POST',
    url: assignmentUrls.attempts(assignmentId),
    data: payload,
  });
}
