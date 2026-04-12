import { request } from 'src/utils/axios';

import type {
  AdminMutationResponse,
  AdminOffsetPage,
} from 'src/sections/apps/admin/types';

import type {
  AdminExamDetail,
  AdminExamKind,
  AdminExamSummary,
  AdminWritingReviewPayload,
} from './types';

const adminExamsUrls = {
  list: (kind: AdminExamKind) => `/api/v1/admin/exams/${kind}`,
  detail: (kind: AdminExamKind, examId: number) => `/api/v1/admin/exams/${kind}/${examId}`,
  reviewWritingPart: (examPartId: number) => `/api/v1/admin/exams/writing/parts/${examPartId}/review`,
} as const;

export function fetchAdminExams(
  kind: AdminExamKind,
  params: { offset: number; limit: number }
) {
  return request<AdminOffsetPage<AdminExamSummary>>({
    method: 'GET',
    url: adminExamsUrls.list(kind),
    params,
  });
}

export function fetchAdminExamDetail(kind: AdminExamKind, examId: number) {
  return request<AdminExamDetail>({
    method: 'GET',
    url: adminExamsUrls.detail(kind, examId),
  });
}

export function reviewAdminWritingPart(
  examPartId: number,
  payload: AdminWritingReviewPayload
) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminExamsUrls.reviewWritingPart(examPartId),
    data: payload,
  });
}
