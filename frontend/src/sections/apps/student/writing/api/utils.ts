import { localStorageAvailable } from 'src/utils/storage-available';
import { countWords } from 'src/sections/apps/common/module-test/utils/scoring';

import type {
  BackendExamPublic,
  BackendOffsetPage,
  BackendWritingAnswerSpec,
  BackendWritingListItem,
  BackendWritingPart,
  BackendWritingSubmitResult,
  BackendWritingTestDetail,
  WritingAnswerSpec,
  WritingDraftResponses,
  WritingExamPage,
  WritingExamSummary,
  WritingListItem,
  WritingListPage,
  WritingListRequestParams,
  WritingPart,
  WritingPromptAssets,
  WritingStoredResult,
  WritingStoredResultAnswer,
  WritingSubmitPartInput,
  WritingTestDetail,
} from './types';

export const WRITING_LIST_DEFAULT_PAGE_SIZE = 12;
export const WRITING_EXAMS_LOOKUP_LIMIT = 100;

const SECONDS_IN_MINUTE = 60;

const WRITING_ACTIVE_EXAMS_STORAGE_KEY = 'student-writing-active-exams';
const WRITING_DRAFTS_STORAGE_KEY = 'student-writing-drafts';
const WRITING_RESULTS_STORAGE_KEY = 'student-writing-results';

type WritingActiveExamsStore = Record<string, number>;
type WritingDraftStore = Record<string, WritingDraftResponses>;
type WritingResultsStore = Record<string, WritingStoredResult>;

function readStorageItem<T>(key: string): T | null {
  if (!localStorageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorageItem<T>(key: string, value: T) {
  if (!localStorageAvailable()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getWritingActiveExamsStore() {
  const store = readStorageItem<WritingActiveExamsStore>(WRITING_ACTIVE_EXAMS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function getWritingDraftStore() {
  const store = readStorageItem<WritingDraftStore>(WRITING_DRAFTS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function getWritingResultsStore() {
  const store = readStorageItem<WritingResultsStore>(WRITING_RESULTS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function toWritingPromptAssets(prompt: BackendWritingPart['prompt']): WritingPromptAssets {
  return {
    text: prompt.text,
    imageUrls: prompt.imageUrls,
    fileUrls: prompt.fileUrls,
  };
}

function toWritingAnswerSpec(spec: BackendWritingAnswerSpec): WritingAnswerSpec {
  return {
    answerType: spec.answerType,
    inputVariant: spec.inputVariant,
  };
}

function toWritingPart(part: BackendWritingPart): WritingPart {
  return {
    id: part.id,
    order: part.order,
    testId: part.testId,
    task: part.task,
    imageUrl: part.imageUrl ?? null,
    fileUrls: part.fileUrls,
    prompt: toWritingPromptAssets(part.prompt),
    answerSpec: toWritingAnswerSpec(part.answerSpec),
  };
}

/** Cumulative list: `offset` 0, `limit` = batches × `batchSize` (URL `page` = batch count, min 1). */
export function buildWritingListRequestParams(
  loadedBatchCount: number,
  batchSize: number
): WritingListRequestParams {
  const batches = Math.max(1, loadedBatchCount);

  return {
    offset: 0,
    limit: batches * batchSize,
  };
}

export function toWritingListItem(item: BackendWritingListItem): WritingListItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    timeLimit: item.timeLimit,
    durationMinutes: Math.max(1, Math.ceil(item.timeLimit / SECONDS_IN_MINUTE)),
    isActive: item.isActive,
    createdAt: item.createdAt,
    attemptsCount: Math.max(0, item.attemptsCount ?? 0),
    successfulAttemptsCount: Math.max(0, item.successfulAttemptsCount ?? 0),
    failedAttemptsCount: Math.max(0, item.failedAttemptsCount ?? 0),
    origin: item.origin ?? null,
  };
}

export function toWritingListPage(
  response: BackendOffsetPage<BackendWritingListItem>
): WritingListPage {
  const items = response.items.map(toWritingListItem);

  return {
    items,
    limit: response.limit,
    offset: response.offset,
    page: Math.floor(response.offset / Math.max(response.limit, 1)) + 1,
    hasPreviousPage: response.offset > 0,
    hasNextPage: items.length === response.limit,
  };
}

export function toWritingTestDetail(response: BackendWritingTestDetail): WritingTestDetail {
  const parts = response.parts.map(toWritingPart);
  const writingParts = response.writingParts.map(toWritingPart);

  return {
    id: response.id,
    title: response.title,
    description: response.description,
    timeLimit: response.timeLimit,
    createdAt: response.createdAt,
    parts,
    writingParts,
    origin: response.origin ?? null,
  };
}

export function getWritingParts(detail: WritingTestDetail) {
  return detail.parts.length ? detail.parts : detail.writingParts;
}

export function getWritingTimeLimit(detail: WritingTestDetail) {
  return detail.timeLimit;
}

export function getWritingTaskCount(detail: WritingTestDetail) {
  return getWritingParts(detail).length;
}

export function toWritingExamSummary(exam: BackendExamPublic): WritingExamSummary {
  let status: WritingExamSummary['status'] = 'not_started';

  if (exam.finishedAt) {
    status = 'completed';
  } else if (exam.startedAt) {
    status = 'in_progress';
  }

  return {
    ...exam,
    kind: 'writing',
    status,
  };
}

export function toWritingExamPage(response: BackendOffsetPage<BackendExamPublic>): WritingExamPage {
  return {
    ...response,
    items: response.items
      .filter((item): item is BackendExamPublic & { kind: 'writing' } => item.kind === 'writing')
      .map(toWritingExamSummary),
  };
}

export function hasWritingEssay(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildWritingSubmitPayload(
  detail: WritingTestDetail,
  responses: WritingDraftResponses
): WritingSubmitPartInput[] {
  return getWritingParts(detail).map((part) => ({
    partId: part.id,
    essay: responses[String(part.id)] ?? '',
  }));
}

export function findWritingExamById(exams: WritingExamSummary[], examId?: number | null) {
  if (!examId) {
    return null;
  }

  return exams.find((item) => item.id === examId) ?? null;
}

export function findLatestUnfinishedWritingExamForTest(
  testId: number,
  exams: WritingExamSummary[]
) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId && exam.status !== 'completed') {
      return exam;
    }
  }

  return null;
}

export function findLatestWritingExamForTest(testId: number, exams: WritingExamSummary[]) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId) {
      return exam;
    }
  }

  return null;
}

export function resolveWritingRemainingTimeSeconds(
  startedAt: string | null | undefined,
  timeLimit: number,
  now = Date.now()
) {
  if (!startedAt) {
    return timeLimit;
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    return timeLimit;
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAtMs) / 1000));

  return Math.max(0, timeLimit - elapsedSeconds);
}

export function resolveWritingFinishReason(
  startedAt: string | null | undefined,
  timeLimit: number,
  finishedAt = new Date().toISOString()
) {
  if (!startedAt) {
    return 'completed';
  }

  const startedAtMs = new Date(startedAt).getTime();
  const finishedAtMs = new Date(finishedAt).getTime();

  if (Number.isNaN(startedAtMs) || Number.isNaN(finishedAtMs)) {
    return 'completed';
  }

  const elapsedSeconds = Math.max(0, Math.floor((finishedAtMs - startedAtMs) / 1000));

  return elapsedSeconds >= timeLimit ? 'time_is_up' : 'completed';
}

export function getWritingActiveExamId(testId: number) {
  const store = getWritingActiveExamsStore();
  const value = store[String(testId)];

  return typeof value === 'number' ? value : null;
}

export function setWritingActiveExam(testId: number, examId: number) {
  const store = getWritingActiveExamsStore();

  writeStorageItem(WRITING_ACTIVE_EXAMS_STORAGE_KEY, {
    ...store,
    [String(testId)]: examId,
  });
}

export function clearWritingActiveExam(testId: number) {
  const store = getWritingActiveExamsStore();
  const nextStore = { ...store };

  delete nextStore[String(testId)];

  writeStorageItem(WRITING_ACTIVE_EXAMS_STORAGE_KEY, nextStore);
}

export function getWritingDraftResponses(examId: number): WritingDraftResponses {
  const store = getWritingDraftStore();
  const value = store[String(examId)];

  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, essay]) => typeof essay === 'string')
      .map(([partId, essay]) => [partId, essay])
  );
}

export function setWritingDraftResponses(examId: number, responses: WritingDraftResponses) {
  const store = getWritingDraftStore();

  writeStorageItem(WRITING_DRAFTS_STORAGE_KEY, {
    ...store,
    [String(examId)]: responses,
  });
}

export function clearWritingDraftResponses(examId: number) {
  const store = getWritingDraftStore();
  const nextStore = { ...store };

  delete nextStore[String(examId)];

  writeStorageItem(WRITING_DRAFTS_STORAGE_KEY, nextStore);
}

export function getWritingStoredResult(examId: number) {
  const store = getWritingResultsStore();
  const value = store[String(examId)];

  return value ?? null;
}

export function setWritingStoredResult(result: WritingStoredResult) {
  const store = getWritingResultsStore();

  writeStorageItem(WRITING_RESULTS_STORAGE_KEY, {
    ...store,
    [String(result.examId)]: result,
  });
}

export function findLatestStoredWritingResultForTest(testId: number) {
  const store = Object.values(getWritingResultsStore());

  return store
    .filter((item) => item.testId === testId)
    .sort((left, right) => right.examId - left.examId)[0] ?? null;
}

function toStoredWritingResultAnswer(
  examId: number,
  part: WritingSubmitPartInput,
  detail: WritingTestDetail
): WritingStoredResultAnswer {
  const detailPart = getWritingParts(detail).find((item) => item.id === part.partId);
  const order = detailPart?.order ?? 0;
  const essay = part.essay ?? '';

  return {
    id: part.partId,
    examId,
    partId: part.partId,
    order,
    taskLabel: `Task ${order || '?'}`,
    promptText: detailPart?.prompt.text ?? detailPart?.task ?? '',
    essay,
    corrections: 'AI evaluation is pending. Please retry shortly to see detailed feedback.',
    score: null,
    isChecked: false,
    wordCount: countWords(essay),
  };
}

function toWritingFinishReason(
  result: BackendWritingSubmitResult['result']
): 'completed' | 'time_is_up' | 'left' | 'in_progress' {
  if (result === 'success') {
    return 'completed';
  }
  if (result === 'failed') {
    return 'time_is_up';
  }
  return 'in_progress';
}

function normalizeWritingFinishReason(
  value: string | null | undefined
): 'completed' | 'time_is_up' | 'left' | 'in_progress' | null {
  if (value === 'completed' || value === 'time_is_up' || value === 'left' || value === 'in_progress') {
    return value;
  }
  return null;
}

export function toWritingStoredResult(params: {
  exam: WritingExamSummary;
  detail: WritingTestDetail;
  submitResult: BackendWritingSubmitResult;
  submittedParts: WritingSubmitPartInput[];
  finishedAt?: string;
}) {
  const { exam, detail, submitResult, submittedParts } = params;
  const finishedAt = params.finishedAt ?? new Date().toISOString();

  const answers = submittedParts
    .map((item) => toStoredWritingResultAnswer(exam.id, item, detail))
    .sort((left, right) => left.order - right.order);

  return {
    examId: exam.id,
    testId: detail.id,
    testTitle: detail.title,
    testDescription: detail.description,
    submittedAt: finishedAt,
    result: submitResult.result,
    finishReason: normalizeWritingFinishReason(exam.finishReason) ?? toWritingFinishReason(submitResult.result),
    score: submitResult.score,
    timeSpent: submitResult.timeSpent,
    totalTasks: getWritingTaskCount(detail),
    reviewedTasks: 0,
    answers,
  } satisfies WritingStoredResult;
}
