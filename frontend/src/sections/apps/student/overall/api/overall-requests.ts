import { request } from 'src/utils/axios';

import type {
  BackendOverallExamList,
  BackendOverallExamResult,
  BackendOverallExamState,
  OverallExamStatus,
} from './types';

const overallUrls = {
  start: '/api/v1/exams/overall/start',
  state: (overallId: number) => `/api/v1/exams/overall/${overallId}`,
  continue: (overallId: number) => `/api/v1/exams/overall/${overallId}/continue`,
  result: (overallId: number) => `/api/v1/exams/overall/${overallId}/result`,
  list: '/api/v1/exams/overall/my-tests',
} as const;

export function startOverallExam() {
  return request<BackendOverallExamState>({
    method: 'POST',
    url: overallUrls.start,
  });
}

export function fetchOverallExamState(overallId: number) {
  return request<BackendOverallExamState>({
    method: 'GET',
    url: overallUrls.state(overallId),
  });
}

export function continueOverallExam(overallId: number) {
  return request<BackendOverallExamState>({
    method: 'POST',
    url: overallUrls.continue(overallId),
  });
}

export function fetchOverallExamResult(overallId: number) {
  return request<BackendOverallExamResult>({
    method: 'GET',
    url: overallUrls.result(overallId),
  });
}

export function fetchOverallExamList(params?: {
  status?: OverallExamStatus;
  ordering?: string;
  offset?: number;
  limit?: number;
}) {
  return request<BackendOverallExamList>({
    method: 'GET',
    url: overallUrls.list,
    params,
  });
}
