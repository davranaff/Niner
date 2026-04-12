import { request } from 'src/utils/axios';

import { fetchWritingDetail } from 'src/sections/apps/student/writing/api/writing-requests';
import type { AdminDeleteResponse, AdminMutationResponse, AdminOffsetPage } from 'src/sections/apps/admin/types';

import type {
  AdminWritingListItem,
  AdminWritingRawDetail,
  AdminWritingTestFormValues,
} from './types';

const adminWritingUrls = {
  list: '/api/v1/admin/writing/tests',
  create: '/api/v1/admin/writing/tests',
  patch: (testId: number) => `/api/v1/admin/writing/tests/${testId}`,
  delete: (testId: number) => `/api/v1/admin/writing/tests/${testId}`,
  createPart: (testId: number) => `/api/v1/admin/writing/tests/${testId}/parts`,
  patchPart: (partId: number) => `/api/v1/admin/writing/parts/${partId}`,
  deletePart: (partId: number) => `/api/v1/admin/writing/parts/${partId}`,
} as const;

export function fetchAdminWritingList(params: { offset: number; limit: number }) {
  return request<AdminOffsetPage<AdminWritingListItem>>({
    method: 'GET',
    url: adminWritingUrls.list,
    params,
  });
}

export function fetchAdminWritingPublicDetail(testId: number) {
  return fetchWritingDetail(testId) as Promise<AdminWritingRawDetail>;
}

export function createAdminWritingTest(payload: AdminWritingTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminWritingUrls.create,
    data: payload,
  });
}

export function updateAdminWritingTest(testId: number, payload: AdminWritingTestFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminWritingUrls.patch(testId),
    data: payload,
  });
}

export function deleteAdminWritingTest(testId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminWritingUrls.delete(testId),
  });
}

export function createAdminWritingPart(
  testId: number,
  payload: { order: number; task: string; imageUrl: string | null; fileUrls: string[] }
) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminWritingUrls.createPart(testId),
    data: payload,
  });
}

export function updateAdminWritingPart(
  partId: number,
  payload: { order: number; task: string; imageUrl: string | null; fileUrls: string[] }
) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminWritingUrls.patchPart(partId),
    data: payload,
  });
}

export function deleteAdminWritingPart(partId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminWritingUrls.deletePart(partId),
  });
}
