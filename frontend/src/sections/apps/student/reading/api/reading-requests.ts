import { request } from 'src/utils/axios';

import type {
  BackendExamDraftOut,
  BackendExamPublic,
  BackendExamsMeResponse,
  BackendOffsetPage,
  BackendReadingListItem,
  BackendReadingSubmitResult,
  BackendReadingTestDetail,
  ReadingCreateExamPayload,
  ReadingListRequestParams,
  ReadingMyExamsRequestParams,
  ReadingSubmitAnswerInput,
} from './types';

const readingUrls = {
  list: '/api/v1/reading/tests',
  detail: (testId: number) => `/api/v1/reading/tests/${testId}`,
  createExam: '/api/v1/exams/reading',
  startExam: (examId: number) => `/api/v1/exams/reading/${examId}/start`,
  saveDraft: (examId: number) => `/api/v1/exams/reading/${examId}/draft`,
  submitExam: (examId: number) => `/api/v1/exams/reading/${examId}/submit`,
  examResult: (examId: number) => `/api/v1/exams/reading/${examId}/result`,
  myExams: '/api/v1/exams/me',
} as const;

export function fetchReadingList(params: ReadingListRequestParams) {
  return request<BackendOffsetPage<BackendReadingListItem>>({
    method: 'GET',
    url: readingUrls.list,
    params,
  });
}

export function fetchReadingDetail(testId: number) {
  return request<BackendReadingTestDetail>({
    method: 'GET',
    url: readingUrls.detail(testId),
  });
}

export function createReadingExam(payload: ReadingCreateExamPayload) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: readingUrls.createExam,
    data: payload,
  });
}

export function startReadingExam(examId: number) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: readingUrls.startExam(examId),
  });
}

export function submitReadingExam(
  examId: number,
  payload: ReadingSubmitAnswerInput[],
  finishReason?: 'left' | 'time_is_up'
) {
  return request<BackendReadingSubmitResult>({
    method: 'POST',
    url: readingUrls.submitExam(examId),
    data: payload,
    params: finishReason ? { finishReason } : undefined,
  });
}

export function saveReadingExamDraft(examId: number, payload: ReadingSubmitAnswerInput[]) {
  return request<BackendExamDraftOut>({
    method: 'PUT',
    url: readingUrls.saveDraft(examId),
    data: payload,
  });
}

export function fetchReadingExamResult(examId: number) {
  return request<BackendReadingSubmitResult>({
    method: 'GET',
    url: readingUrls.examResult(examId),
  });
}

export function fetchMyReadingExams(params: ReadingMyExamsRequestParams) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: readingUrls.myExams,
    params,
  });
}
