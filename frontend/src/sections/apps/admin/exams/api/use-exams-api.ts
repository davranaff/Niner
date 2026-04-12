import { keepPreviousData } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';
import {
  buildAdminLoadMoreParams,
  toAdminLoadMorePage,
} from 'src/sections/apps/admin/utils';

import {
  fetchAdminExamDetail,
  fetchAdminExams,
  reviewAdminWritingPart,
} from './exams-requests';
import { ADMIN_EXAM_BATCH_SIZE } from './utils';
import type {
  AdminExamKind,
  AdminWritingReviewPayload,
} from './types';

const adminExamsQueryRoot = ['admin-exams'] as const;

export const adminExamsQueryKeys = {
  root: adminExamsQueryRoot,
  listRoot: [...adminExamsQueryRoot, 'list'] as const,
  list: (kind: AdminExamKind, page: number, batchSize: number) =>
    [...adminExamsQueryRoot, 'list', kind, { page, batchSize }] as const,
  detail: (kind: AdminExamKind, examId: number) =>
    [...adminExamsQueryRoot, 'detail', kind, examId] as const,
};

export function useAdminExamsListQuery(
  kind: AdminExamKind,
  page: number,
  batchSize = ADMIN_EXAM_BATCH_SIZE
) {
  return useFetch(
    adminExamsQueryKeys.list(kind, page, batchSize),
    async () => {
      const response = await fetchAdminExams(kind, buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminExamDetailQuery(kind: AdminExamKind, examId: number) {
  return useFetch(
    adminExamsQueryKeys.detail(kind, examId),
    () => fetchAdminExamDetail(kind, examId),
    { enabled: examId > 0 }
  );
}

export function useAdminWritingReviewMutation() {
  return useMutate(
    ({ examPartId, payload }: { examPartId: number; payload: AdminWritingReviewPayload }) =>
      reviewAdminWritingPart(examPartId, payload)
  );
}
