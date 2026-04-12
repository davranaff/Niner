import type { ActiveIeltsModule } from 'src/_mock/ielts';
import { request } from 'src/utils/axios';

import { getModuleAttemptPath, getModuleSessionPath } from './module-meta';

type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  count?: number | null;
};

type BackendExamKind = 'reading' | 'listening' | 'writing';

export type BackendExamPublic = {
  id: number;
  userId: number;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  testId: number;
  kind: BackendExamKind;
};

export type BackendExamsMeResponse = {
  reading: BackendOffsetPage<BackendExamPublic>;
  listening: BackendOffsetPage<BackendExamPublic>;
  writing: BackendOffsetPage<BackendExamPublic>;
};

type ExamHistorySource = Pick<
  BackendExamPublic,
  'id' | 'testId' | 'startedAt' | 'finishedAt' | 'finishReason'
>;

export type AttemptHistoryStatus = 'in_progress' | 'completed' | 'terminated';

export type ModuleAttemptHistoryItem = ExamHistorySource & {
  status: AttemptHistoryStatus;
  updatedAt: string | null;
  actionPath: string;
};

const TERMINATED_FINISH_REASONS = new Set(['left', 'time_is_up', 'timeout', 'tab_switch']);

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseTrailingNumber(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const asString = String(value);
  const directNumber = Number(asString);
  if (Number.isFinite(directNumber)) {
    return directNumber;
  }

  const trailingDigits = asString.match(/(\d+)$/);
  if (!trailingDigits) {
    return null;
  }

  const parsed = Number(trailingDigits[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveAttemptStatus(
  exam: Pick<BackendExamPublic, 'finishedAt' | 'finishReason'>
): AttemptHistoryStatus {
  if (!exam.finishedAt) {
    return 'in_progress';
  }

  if (exam.finishReason && TERMINATED_FINISH_REASONS.has(exam.finishReason)) {
    return 'terminated';
  }

  return 'completed';
}

export function getModuleExams(
  response: BackendExamsMeResponse | undefined,
  module: ActiveIeltsModule
): BackendExamPublic[] {
  if (!response) {
    return [];
  }

  if (module === 'reading') {
    return response.reading.items.filter((item) => item.kind === 'reading');
  }

  if (module === 'listening') {
    return response.listening.items.filter((item) => item.kind === 'listening');
  }

  return response.writing.items.filter((item) => item.kind === 'writing');
}

export function toModuleAttemptHistoryItems(
  module: ActiveIeltsModule,
  exams: ExamHistorySource[],
  testId: string | number
): ModuleAttemptHistoryItem[] {
  const normalizedTestId = parseTrailingNumber(testId);

  return exams
    .filter((exam) => {
      if (String(exam.testId) === String(testId)) {
        return true;
      }

      if (normalizedTestId == null) {
        return false;
      }

      return exam.testId === normalizedTestId;
    })
    .map((exam) => {
      const status = resolveAttemptStatus(exam);
      const updatedAt = exam.finishedAt ?? exam.startedAt ?? null;

      return {
        ...exam,
        status,
        updatedAt,
        actionPath:
          status === 'in_progress'
            ? getModuleSessionPath(module, String(exam.testId))
            : getModuleAttemptPath(module, String(exam.id)),
      };
    })
    .sort((left, right) => {
      const byUpdatedAt = toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
      if (byUpdatedAt !== 0) {
        return byUpdatedAt;
      }
      return right.id - left.id;
    });
}

export function fetchExamsMe(limit = 100) {
  return request<BackendExamsMeResponse>({
    method: 'GET',
    url: '/api/v1/exams/me',
    params: {
      readingOffset: 0,
      listeningOffset: 0,
      writingOffset: 0,
      limit,
    },
  });
}
