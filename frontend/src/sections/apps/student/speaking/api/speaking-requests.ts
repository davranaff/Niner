import { request } from 'src/utils/axios';

import type {
  BackendExamPublic,
  BackendExamsMeResponse,
  BackendOffsetPage,
  SpeakingCreateExamPayload,
  SpeakingExaminerDecisionRequest,
  SpeakingExaminerDecisionResponse,
  SpeakingFinalizePayload,
  SpeakingListRequestParams,
  SpeakingMyExamsRequestParams,
  SpeakingSessionPersistPayload,
  SpeakingTtsPayload,
} from './types';
import type {
  SpeakingAttempt,
  SpeakingSession,
  SpeakingTestDetail,
  SpeakingTestListItem,
} from '../types';

const speakingUrls = {
  list: '/api/v1/speaking/tests',
  detail: (testId: number) => `/api/v1/speaking/tests/${testId}`,
  createExam: '/api/v1/exams/speaking',
  startExam: (examId: number) => `/api/v1/exams/speaking/${examId}/start`,
  myExams: '/api/v1/exams/me',
  session: (examId: number) => `/api/v1/exams/speaking/${examId}/session`,
  examinerDecision: (examId: number) => `/api/v1/exams/speaking/${examId}/examiner-decision`,
  finalize: (examId: number) => `/api/v1/exams/speaking/${examId}/finalize`,
  tts: '/api/v1/speaking/tts',
} as const;

export function fetchSpeakingList(params: SpeakingListRequestParams) {
  return request<BackendOffsetPage<SpeakingTestListItem>>({
    method: 'GET',
    url: speakingUrls.list,
    params,
  });
}

export function fetchSpeakingDetail(testId: number) {
  return request<SpeakingTestDetail>({
    method: 'GET',
    url: speakingUrls.detail(testId),
  });
}

export function createSpeakingExam(payload: SpeakingCreateExamPayload) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: speakingUrls.createExam,
    data: payload,
  });
}

export function startSpeakingExam(examId: number) {
  return request<BackendExamPublic>({
    method: 'POST',
    url: speakingUrls.startExam(examId),
  });
}

export function fetchMySpeakingExams(params: SpeakingMyExamsRequestParams) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: speakingUrls.myExams,
    params,
  });
}

export function fetchSpeakingSession(examId: number) {
  return request<SpeakingSession>({
    method: 'GET',
    url: speakingUrls.session(examId),
  });
}

export function persistSpeakingSession(examId: number, payload: SpeakingSessionPersistPayload) {
  return request<SpeakingSession>({
    method: 'PUT',
    url: speakingUrls.session(examId),
    data: payload,
  });
}

export function fetchExaminerDecision(examId: number, payload: SpeakingExaminerDecisionRequest) {
  return request<SpeakingExaminerDecisionResponse>({
    method: 'POST',
    url: speakingUrls.examinerDecision(examId),
    data: payload,
  });
}

export function finalizeSpeakingExam(examId: number, payload: SpeakingFinalizePayload) {
  return request<SpeakingAttempt>({
    method: 'POST',
    url: speakingUrls.finalize(examId),
    data: payload,
  });
}

export async function synthesizeSpeakingTts(payload: SpeakingTtsPayload, signal?: AbortSignal) {
  return request<ArrayBuffer>({
    method: 'POST',
    url: speakingUrls.tts,
    data: payload,
    responseType: 'arraybuffer',
    signal,
  });
}
