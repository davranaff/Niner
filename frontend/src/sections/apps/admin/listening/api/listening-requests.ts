import { request } from 'src/utils/axios';

import { fetchListeningDetail } from 'src/sections/apps/student/listening/api/listening-requests';
import type { AdminDeleteResponse, AdminMutationResponse, AdminOffsetPage } from 'src/sections/apps/admin/types';

import type {
  AdminListeningAnswerFormValues,
  AdminListeningBlockFormValues,
  AdminListeningListItem,
  AdminListeningPartFormValues,
  AdminListeningQuestionFormValues,
  AdminListeningRawDetail,
  AdminListeningTestFormValues,
  AdminListeningOptionFormValues,
} from './types';

const adminListeningUrls = {
  list: '/api/v1/admin/listening/tests',
  create: '/api/v1/admin/listening/tests',
  patch: (testId: number) => `/api/v1/admin/listening/tests/${testId}`,
  delete: (testId: number) => `/api/v1/admin/listening/tests/${testId}`,
  createPart: (testId: number) => `/api/v1/admin/listening/tests/${testId}/parts`,
  patchPart: (partId: number) => `/api/v1/admin/listening/parts/${partId}`,
  deletePart: (partId: number) => `/api/v1/admin/listening/parts/${partId}`,
  createBlock: (partId: number) => `/api/v1/admin/listening/parts/${partId}/blocks`,
  patchBlock: (blockId: number) => `/api/v1/admin/listening/blocks/${blockId}`,
  deleteBlock: (blockId: number) => `/api/v1/admin/listening/blocks/${blockId}`,
  createQuestion: (blockId: number) => `/api/v1/admin/listening/blocks/${blockId}/questions`,
  patchQuestion: (questionId: number) => `/api/v1/admin/listening/questions/${questionId}`,
  deleteQuestion: (questionId: number) => `/api/v1/admin/listening/questions/${questionId}`,
  createOption: (questionId: number) => `/api/v1/admin/listening/questions/${questionId}/options`,
  patchOption: (optionId: number) => `/api/v1/admin/listening/options/${optionId}`,
  deleteOption: (optionId: number) => `/api/v1/admin/listening/options/${optionId}`,
  createAnswer: (questionId: number) => `/api/v1/admin/listening/questions/${questionId}/answers`,
  patchAnswer: (answerId: number) => `/api/v1/admin/listening/answers/${answerId}`,
  deleteAnswer: (answerId: number) => `/api/v1/admin/listening/answers/${answerId}`,
} as const;

export function fetchAdminListeningList(params: { offset: number; limit: number }) {
  return request<AdminOffsetPage<AdminListeningListItem>>({
    method: 'GET',
    url: adminListeningUrls.list,
    params,
  });
}

export function fetchAdminListeningPublicDetail(testId: number) {
  return fetchListeningDetail(testId) as Promise<AdminListeningRawDetail>;
}

export function createAdminListeningTest(payload: AdminListeningTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.create,
    data: payload,
  });
}

export function updateAdminListeningTest(testId: number, payload: AdminListeningTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patch(testId),
    data: payload,
  });
}

export function deleteAdminListeningTest(testId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.delete(testId),
  });
}

export function createAdminListeningPart(testId: number, payload: AdminListeningPartFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.createPart(testId),
    data: payload,
  });
}

export function updateAdminListeningPart(partId: number, payload: AdminListeningPartFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patchPart(partId),
    data: payload,
  });
}

export function deleteAdminListeningPart(partId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.deletePart(partId),
  });
}

export function createAdminListeningBlock(partId: number, payload: AdminListeningBlockFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.createBlock(partId),
    data: payload,
  });
}

export function updateAdminListeningBlock(blockId: number, payload: AdminListeningBlockFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patchBlock(blockId),
    data: payload,
  });
}

export function deleteAdminListeningBlock(blockId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.deleteBlock(blockId),
  });
}

export function createAdminListeningQuestion(blockId: number, payload: AdminListeningQuestionFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.createQuestion(blockId),
    data: payload,
  });
}

export function updateAdminListeningQuestion(questionId: number, payload: AdminListeningQuestionFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patchQuestion(questionId),
    data: payload,
  });
}

export function deleteAdminListeningQuestion(questionId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.deleteQuestion(questionId),
  });
}

export function createAdminListeningOption(questionId: number, payload: AdminListeningOptionFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.createOption(questionId),
    data: payload,
  });
}

export function updateAdminListeningOption(optionId: number, payload: AdminListeningOptionFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patchOption(optionId),
    data: payload,
  });
}

export function deleteAdminListeningOption(optionId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.deleteOption(optionId),
  });
}

export function createAdminListeningAnswer(questionId: number, payload: AdminListeningAnswerFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminListeningUrls.createAnswer(questionId),
    data: payload,
  });
}

export function updateAdminListeningAnswer(answerId: number, payload: AdminListeningAnswerFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminListeningUrls.patchAnswer(answerId),
    data: payload,
  });
}

export function deleteAdminListeningAnswer(answerId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminListeningUrls.deleteAnswer(answerId),
  });
}
