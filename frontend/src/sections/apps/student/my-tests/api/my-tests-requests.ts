import { request } from 'src/utils/axios';

import type { BackendStudentAttemptListResponse, MyTestsRequestParams } from './types';

const myTestsUrls = {
  list: '/api/v1/exams/my-tests',
} as const;

export function fetchStudentAttempts(params: MyTestsRequestParams, signal?: AbortSignal) {
  return request<BackendStudentAttemptListResponse>({
    method: 'GET',
    url: myTestsUrls.list,
    params,
    signal,
  });
}
