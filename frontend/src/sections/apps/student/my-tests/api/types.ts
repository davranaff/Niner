export type StudentTestModule = 'reading' | 'listening' | 'writing' | 'speaking';
export type StudentAttemptStatus = 'in_progress' | 'completed' | 'terminated';
export type StudentAttemptFinishReason = 'completed' | 'left' | 'time_is_up';

export type MyTestsListFilters = {
  page: number;
  rowsPerPage: number;
  search: string;
  ordering: string;
  module: string;
  status: string;
};

export type MyTestsRequestParams = {
  offset: number;
  limit: number;
  ordering: string;
  search?: string;
  module?: StudentTestModule;
  status?: StudentAttemptStatus;
};

export type BackendStudentAttemptListItem = {
  id: number;
  kind: StudentTestModule;
  testId: number;
  testTitle: string;
  timeLimit: number;
  status: StudentAttemptStatus;
  finishReason: StudentAttemptFinishReason | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedBand: number | null;
};

export type BackendStudentAttemptListResponse = {
  items: BackendStudentAttemptListItem[];
  count: number;
  limit: number;
  offset: number;
};

export type StudentAttemptListItem = {
  id: number;
  module: StudentTestModule;
  testId: number;
  testTitle: string;
  durationMinutes: number;
  status: StudentAttemptStatus;
  finishReason: StudentAttemptFinishReason | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedBand: number | null;
};

export type StudentAttemptListPage = {
  items: StudentAttemptListItem[];
  count: number;
  limit: number;
  offset: number;
};
