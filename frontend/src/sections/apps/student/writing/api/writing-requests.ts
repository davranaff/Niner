import { request } from 'src/utils/axios';

import type {
  BackendExamDraftOut,
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
  saveDraft: (examId: number) => `/api/v1/exams/writing/${examId}/draft`,
  submitExam: (examId: number) => `/api/v1/exams/writing/${examId}/submit`,
  examResult: (examId: number) => `/api/v1/exams/writing/${examId}/result`,
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

export function submitWritingExam(
  examId: number,
  payload: WritingSubmitPartInput[],
  finishReason?: 'left' | 'time_is_up'
) {
  return request<BackendWritingSubmitResult>({
    method: 'POST',
    url: writingUrls.submitExam(examId),
    data: payload,
    params: finishReason ? { finishReason } : undefined,
  });
}

export function saveWritingExamDraft(examId: number, payload: WritingSubmitPartInput[]) {
  return request<BackendExamDraftOut>({
    method: 'PUT',
    url: writingUrls.saveDraft(examId),
    data: payload,
  });
}

export function fetchWritingExamResult(examId: number) {
  return request<BackendWritingSubmitResult>({
    method: 'GET',
    url: writingUrls.examResult(examId),
  });
}

export function fetchMyWritingExams(params: WritingMyExamsRequestParams) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: writingUrls.myExams,
    params,
  });
}
