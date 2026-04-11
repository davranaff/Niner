import type {
  BackendStudentAttemptListItem,
  BackendStudentAttemptListResponse,
  MyTestsListFilters,
  MyTestsRequestParams,
  StudentAttemptListItem,
  StudentAttemptListPage,
  StudentAttemptStatus,
  StudentTestModule,
} from './types';

const SECONDS_IN_MINUTE = 60;

export const MY_TESTS_DEFAULT_PAGE_SIZE = 10;

function normalizeModule(value: string): StudentTestModule | undefined {
  if (value === 'reading' || value === 'listening' || value === 'writing') {
    return value;
  }

  return undefined;
}

function normalizeStatus(value: string): StudentAttemptStatus | undefined {
  if (value === 'in_progress' || value === 'completed' || value === 'terminated') {
    return value;
  }

  return undefined;
}

export function buildMyTestsRequestParams(filters: MyTestsListFilters): MyTestsRequestParams {
  return {
    offset: Math.max(0, (filters.page - 1) * filters.rowsPerPage),
    limit: Math.max(1, filters.rowsPerPage),
    ordering: filters.ordering || '-updated_at',
    search: filters.search.trim() || undefined,
    module: normalizeModule(filters.module),
    status: normalizeStatus(filters.status),
  };
}

export function toStudentAttemptListItem(
  item: BackendStudentAttemptListItem
): StudentAttemptListItem {
  return {
    id: item.id,
    module: item.kind,
    testId: item.testId,
    testTitle: item.testTitle,
    durationMinutes: Math.max(1, Math.ceil(item.timeLimit / SECONDS_IN_MINUTE)),
    status: item.status,
    finishReason: item.finishReason,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    estimatedBand: item.estimatedBand,
  };
}

export function toStudentAttemptListPage(
  response: BackendStudentAttemptListResponse
): StudentAttemptListPage {
  return {
    items: response.items.map(toStudentAttemptListItem),
    count: response.count,
    limit: response.limit,
    offset: response.offset,
  };
}
