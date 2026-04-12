import { request } from 'src/utils/axios';

import type {
  BackendExamDraftOut,
  BackendExamPublic,
  BackendExamsMeResponse,
  BackendListeningAttemptPage,
  BackendListeningExamResult,
  BackendListeningListItem,
  BackendListeningTestDetail,
  BackendOffsetPage,
  ListeningCreateExamPayload,
  ListeningListRequestParams,
  ListeningMyExamsRequestParams,
  ListeningMyTestsRequestParams,
  ListeningSubmitAnswerInput,
} from './types';

const listeningUrls = {
  list: '/api/v1/listening/tests',
  detail: (testId: number) => `/api/v1/listening/tests/${testId}`,
  createExam: '/api/v1/exams/listening',
  startExam: (examId: number) => `/api/v1/exams/listening/${examId}/start`,
  saveDraft: (examId: number) => `/api/v1/exams/listening/${examId}/draft`,
  submitExam: (examId: number) => `/api/v1/exams/listening/${examId}/submit`,
  examResult: (examId: number) => `/api/v1/exams/listening/${examId}/result`,
  myExams: '/api/v1/exams/me',
  myTests: '/api/v1/exams/my-tests',
} as const;

export function fetchListeningList(params: ListeningListRequestParams) {
  return request<BackendOffsetPage<BackendListeningListItem>>({
    method: 'GET',
    url: listeningUrls.list,
    params,
  });
}

export function fetchListeningDetail(testId: number) {
  return request<BackendListeningTestDetail>({
    method: 'GET',
    url: listeningUrls.detail(testId),
  });
}

export function createListeningExam(payload: ListeningCreateExamPayload) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: listeningUrls.createExam,
    data: payload,
  });
}

export function startListeningExam(examId: number) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: listeningUrls.startExam(examId),
  });
}

export function submitListeningExam(
  examId: number,
  payload: ListeningSubmitAnswerInput[],
  finishReason?: 'left' | 'time_is_up'
) {
  return request<BackendListeningExamResult>({
    method: 'POST',
    url: listeningUrls.submitExam(examId),
    data: payload,
    params: finishReason ? { finishReason } : undefined,
  });
}

export function saveListeningExamDraft(examId: number, payload: ListeningSubmitAnswerInput[]) {
  return request<BackendExamDraftOut>({
    method: 'PUT',
    url: listeningUrls.saveDraft(examId),
    data: payload,
  });
}

export function fetchListeningExamResult(examId: number) {
  return request<BackendListeningExamResult>({
    method: 'GET',
    url: listeningUrls.examResult(examId),
  });
}

export function fetchMyListeningExams(params: ListeningMyExamsRequestParams) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: listeningUrls.myExams,
    params,
  });
}

export function fetchMyListeningTests(params: ListeningMyTestsRequestParams, signal?: AbortSignal) {
  return request<BackendListeningAttemptPage>({
    method: 'GET',
    url: listeningUrls.myTests,
    params,
    signal,
  });
}
