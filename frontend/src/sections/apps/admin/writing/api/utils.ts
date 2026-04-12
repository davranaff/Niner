import { parseMultiLineValues } from 'src/sections/apps/admin/utils';

import type {
  AdminWritingDetail,
  AdminWritingPart,
  AdminWritingRawDetail,
  AdminWritingRawPart,
  AdminWritingTestSettings,
} from './types';

export const WRITING_ADMIN_BATCH_SIZE = 12;

function toAdminWritingPart(part: AdminWritingRawPart): AdminWritingPart {
  return {
    id: part.id,
    order: part.order,
    testId: part.testId,
    task: part.task,
    imageUrl: part.imageUrl ?? null,
    fileUrls: part.fileUrls ?? [],
  };
}

export function mergeAdminWritingDetail(
  detail: AdminWritingRawDetail,
  settings: AdminWritingTestSettings
): AdminWritingDetail {
  return {
    ...settings,
    createdAt: detail.createdAt,
    parts: detail.parts.map(toAdminWritingPart),
  };
}

export function toWritingPartPayload(values: {
  order: number;
  task: string;
  imageUrl: string;
  fileUrlsText: string;
}) {
  return {
    order: values.order,
    task: values.task,
    imageUrl: values.imageUrl.trim() || null,
    fileUrls: parseMultiLineValues(values.fileUrlsText),
  };
}
