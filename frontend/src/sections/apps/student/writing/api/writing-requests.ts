import { request } from 'src/utils/axios';

import type {
  BackendExamPublic,
  BackendExamsMeResponse,
  BackendOffsetPage,
  BackendWritingListItem,
  BackendWritingSubmitResult,
  BackendWritingTestDetail,
  WritingCreateExamPayload,
  WritingListRequestParams,
  WritingMyExamsRequestParams,
  WritingSubmitPartInput,
} from './types';

const writingUrls = {
  list: '/api/v1/writing/tests',
  detail: (testId: number) => `/api/v1/writing/tests/${testId}`,
  createExam: '/api/v1/exams/writing',
  startExam: (examId: number) => `/api/v1/exams/writing/${examId}/start`,
  submitExam: (examId: number) => `/api/v1/exams/writing/${examId}/submit`,
  myExams: '/api/v1/exams/me',
} as const;

export function fetchWritingList(params: WritingListRequestParams) {
  return request<BackendOffsetPage<BackendWritingListItem>>({
    method: 'GET',
    url: writingUrls.list,
    params,
  });
}

export function fetchWritingDetail(testId: number) {
  return request<BackendWritingTestDetail>({
    method: 'GET',
    url: writingUrls.detail(testId),
  });
}

export function createWritingExam(payload: WritingCreateExamPayload) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: writingUrls.createExam,
    data: payload,
  });
}

export function startWritingExam(examId: number) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: writingUrls.startExam(examId),
  });
}

export function submitWritingExam(examId: number, payload: WritingSubmitPartInput[]) {
  return request<BackendWritingSubmitResult>({
    method: 'POST',
    url: writingUrls.submitExam(examId),
    data: payload,
  });
}

export function fetchMyWritingExams(params: WritingMyExamsRequestParams) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: writingUrls.myExams,
    params,
  });
}
