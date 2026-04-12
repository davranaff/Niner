import { request } from 'src/utils/axios';

import { fetchReadingDetail } from 'src/sections/apps/student/reading/api/reading-requests';

import type { AdminDeleteResponse, AdminMutationResponse, AdminOffsetPage } from 'src/sections/apps/admin/types';
import type {
  AdminReadingAnswerFormValues,
  AdminReadingBlockFormValues,
  AdminReadingListItem,
  AdminReadingPassageFormValues,
  AdminReadingQuestionFormValues,
  AdminReadingRawDetail,
  AdminReadingTestFormValues,
  AdminReadingTestSettings,
  AdminReadingOptionFormValues,
} from './types';

const adminReadingUrls = {
  list: '/api/v1/admin/reading/tests',
  detail: (testId: number) => `/api/v1/admin/reading/tests/${testId}`,
  create: '/api/v1/admin/reading/tests',
  patch: (testId: number) => `/api/v1/admin/reading/tests/${testId}`,
  delete: (testId: number) => `/api/v1/admin/reading/tests/${testId}`,
  createPassage: (testId: number) => `/api/v1/admin/reading/tests/${testId}/passages`,
  patchPassage: (passageId: number) => `/api/v1/admin/reading/passages/${passageId}`,
  deletePassage: (passageId: number) => `/api/v1/admin/reading/passages/${passageId}`,
  createBlock: (passageId: number) => `/api/v1/admin/reading/passages/${passageId}/blocks`,
  patchBlock: (blockId: number) => `/api/v1/admin/reading/blocks/${blockId}`,
  deleteBlock: (blockId: number) => `/api/v1/admin/reading/blocks/${blockId}`,
  createQuestion: (blockId: number) => `/api/v1/admin/reading/blocks/${blockId}/questions`,
  patchQuestion: (questionId: number) => `/api/v1/admin/reading/questions/${questionId}`,
  deleteQuestion: (questionId: number) => `/api/v1/admin/reading/questions/${questionId}`,
  createOption: (questionId: number) => `/api/v1/admin/reading/questions/${questionId}/options`,
  patchOption: (optionId: number) => `/api/v1/admin/reading/options/${optionId}`,
  deleteOption: (optionId: number) => `/api/v1/admin/reading/options/${optionId}`,
  createAnswer: (questionId: number) => `/api/v1/admin/reading/questions/${questionId}/answers`,
  patchAnswer: (answerId: number) => `/api/v1/admin/reading/answers/${answerId}`,
  deleteAnswer: (answerId: number) => `/api/v1/admin/reading/answers/${answerId}`,
} as const;

export function fetchAdminReadingList(params: { offset: number; limit: number }) {
  return request<AdminOffsetPage<AdminReadingListItem>>({
    method: 'GET',
    url: adminReadingUrls.list,
    params,
  });
}

export function fetchAdminReadingSettings(testId: number) {
  return request<AdminReadingTestSettings>({
    method: 'GET',
    url: adminReadingUrls.detail(testId),
  });
}

export function fetchAdminReadingPublicDetail(testId: number) {
  return fetchReadingDetail(testId) as Promise<AdminReadingRawDetail>;
}

export function createAdminReadingTest(payload: AdminReadingTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.create,
    data: payload,
  });
}

export function updateAdminReadingTest(testId: number, payload: AdminReadingTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patch(testId),
    data: payload,
  });
}

export function deleteAdminReadingTest(testId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.delete(testId),
  });
}

export function createAdminReadingPassage(testId: number, payload: AdminReadingPassageFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.createPassage(testId),
    data: payload,
  });
}

export function updateAdminReadingPassage(passageId: number, payload: AdminReadingPassageFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patchPassage(passageId),
    data: payload,
  });
}

export function deleteAdminReadingPassage(passageId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.deletePassage(passageId),
  });
}

export function createAdminReadingBlock(passageId: number, payload: AdminReadingBlockFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.createBlock(passageId),
    data: payload,
  });
}

export function updateAdminReadingBlock(blockId: number, payload: AdminReadingBlockFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patchBlock(blockId),
    data: payload,
  });
}

export function deleteAdminReadingBlock(blockId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.deleteBlock(blockId),
  });
}

export function createAdminReadingQuestion(blockId: number, payload: AdminReadingQuestionFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.createQuestion(blockId),
    data: payload,
  });
}

export function updateAdminReadingQuestion(questionId: number, payload: AdminReadingQuestionFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patchQuestion(questionId),
    data: payload,
  });
}

export function deleteAdminReadingQuestion(questionId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.deleteQuestion(questionId),
  });
}

export function createAdminReadingOption(questionId: number, payload: AdminReadingOptionFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.createOption(questionId),
    data: payload,
  });
}

export function updateAdminReadingOption(optionId: number, payload: AdminReadingOptionFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patchOption(optionId),
    data: payload,
  });
}

export function deleteAdminReadingOption(optionId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.deleteOption(optionId),
  });
}

export function createAdminReadingAnswer(questionId: number, payload: AdminReadingAnswerFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminReadingUrls.createAnswer(questionId),
    data: payload,
  });
}

export function updateAdminReadingAnswer(answerId: number, payload: AdminReadingAnswerFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminReadingUrls.patchAnswer(answerId),
    data: payload,
  });
}

export function deleteAdminReadingAnswer(answerId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminReadingUrls.deleteAnswer(answerId),
  });
}
