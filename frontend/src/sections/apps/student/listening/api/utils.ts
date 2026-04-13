import { localStorageAvailable } from 'src/utils/storage-available';

import type {
  BackendExamPublic,
  BackendListeningAnswerSpec,
  BackendListeningAttemptItem,
  BackendListeningAttemptPage,
  BackendListeningBlock,
  BackendListeningListItem,
  BackendListeningOption,
  BackendListeningQuestion,
  BackendListeningTestDetail,
  BackendOffsetPage,
  ListeningAnswerSpec,
  ListeningAttemptItem,
  ListeningAttemptPage,
  ListeningDraftAnswers,
  ListeningExamPage,
  ListeningExamSummary,
  ListeningListItem,
  ListeningListPage,
  ListeningListRequestParams,
  ListeningPart,
  ListeningQuestion,
  ListeningQuestionOption,
  ListeningQuestionWithContext,
  ListeningSubmitAnswerInput,
  ListeningTestDetail,
} from './types';

export const LISTENING_LIST_DEFAULT_PAGE_SIZE = 12;
export const LISTENING_EXAMS_LOOKUP_LIMIT = 100;

const SECONDS_IN_MINUTE = 60;

const LISTENING_ACTIVE_EXAMS_STORAGE_KEY = 'student-listening-active-exams';
const LISTENING_DRAFTS_STORAGE_KEY = 'student-listening-drafts';

type ListeningActiveExamsStore = Record<string, number>;
type ListeningDraftStore = Record<string, ListeningDraftAnswers>;

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

function getListeningActiveExamsStore() {
  const store = readStorageItem<ListeningActiveExamsStore>(LISTENING_ACTIVE_EXAMS_STORAGE_KEY);
  return store && typeof store === 'object' ? store : {};
}

function getListeningDraftStore() {
  const store = readStorageItem<ListeningDraftStore>(LISTENING_DRAFTS_STORAGE_KEY);
  return store && typeof store === 'object' ? store : {};
}

function toListeningQuestionOption(option: BackendListeningOption): ListeningQuestionOption {
  return {
    id: option.id,
    optionText: option.optionText,
    order: option.order,
  };
}

function toListeningQuestion(question: BackendListeningQuestion): ListeningQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    order: question.order,
    number: question.number,
    answerType: question.answerType,
    inputVariant: question.inputVariant,
    options: question.options.map(toListeningQuestionOption),
  };
}

function toListeningAnswerSpec(spec: BackendListeningAnswerSpec): ListeningAnswerSpec {
  return {
    answerType: spec.answerType,
    inputVariant: spec.inputVariant,
    optionsMode: spec.optionsMode ?? null,
    maxWords: spec.maxWords ?? null,
  };
}

function toListeningBlock(block: BackendListeningBlock) {
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    blockType: block.blockType,
    order: block.order,
    answerSpec: toListeningAnswerSpec(block.answerSpec),
    questions: block.questions.map(toListeningQuestion),
    tableJson: block.tableJson ?? null,
  };
}

function toListeningPart(part: BackendListeningTestDetail['parts'][number]): ListeningPart {
  return {
    id: part.id,
    title: part.title,
    order: part.order,
    partNumber: part.partNumber,
    questionBlocks: part.questionBlocks.map(toListeningBlock),
    questionsCount: part.questionsCount,
  };
}

function toDateTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Cumulative list: `offset` 0, `limit` = batches × `batchSize` (URL `page` = batch count, min 1). */
export function buildListeningListRequestParams(
  loadedBatchCount: number,
  batchSize: number
): ListeningListRequestParams {
  const batches = Math.max(1, loadedBatchCount);

  return {
    offset: 0,
    limit: batches * batchSize,
  };
}

export function buildListeningMyTestsRequestParams(
  page: number,
  rowsPerPage: number,
  testId?: number
) {
  return {
    offset: Math.max(0, (Math.max(1, page) - 1) * rowsPerPage),
    limit: Math.max(1, rowsPerPage),
    ordering: '-updated_at',
    module: 'listening' as const,
    testId,
  };
}

export function toListeningListItem(item: BackendListeningListItem): ListeningListItem {
  return {
    id: item.id,
    title: item.title,
    voiceUrl: item.voiceUrl ?? null,
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

export function toListeningListPage(
  response: BackendOffsetPage<BackendListeningListItem>
): ListeningListPage {
  const items = response.items.map(toListeningListItem);

  return {
    items,
    limit: response.limit,
    offset: response.offset,
    page: Math.floor(response.offset / Math.max(response.limit, 1)) + 1,
    hasPreviousPage: response.offset > 0,
    hasNextPage: items.length === response.limit,
  };
}

export function toListeningTestDetail(response: BackendListeningTestDetail): ListeningTestDetail {
  return {
    id: response.id,
    title: response.title,
    voiceUrl: response.voiceUrl ?? null,
    audioUrl: response.audioUrl ?? null,
    description: response.description,
    timeLimit: response.timeLimit,
    createdAt: response.createdAt,
    parts: response.parts.map(toListeningPart),
    origin: response.origin ?? null,
  };
}

export function getListeningParts(detail: ListeningTestDetail) {
  return detail.parts;
}

export function getListeningTotalQuestions(detail: ListeningTestDetail) {
  return getListeningParts(detail).reduce((total, part) => total + part.questionsCount, 0);
}

export function getListeningTimeLimit(detail: ListeningTestDetail) {
  return detail.timeLimit;
}

export function toListeningExamSummary(exam: BackendExamPublic): ListeningExamSummary {
  let status: ListeningExamSummary['status'] = 'not_started';

  if (exam.finishedAt) {
    status = 'completed';
  } else if (exam.startedAt) {
    status = 'in_progress';
  }

  return {
    ...exam,
    kind: 'listening',
    status,
  };
}

export function toListeningExamPage(
  response: BackendOffsetPage<BackendExamPublic>
): ListeningExamPage {
  return {
    ...response,
    items: response.items
      .filter(
        (item): item is BackendExamPublic & { kind: 'listening' } => item.kind === 'listening'
      )
      .map(toListeningExamSummary),
  };
}

function toListeningAttemptItem(item: BackendListeningAttemptItem): ListeningAttemptItem {
  return {
    id: item.id,
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

export function toListeningAttemptPage(response: BackendListeningAttemptPage): ListeningAttemptPage {
  const items = response.items.map(toListeningAttemptItem);
  return {
    items,
    count: response.count,
    limit: response.limit,
    offset: response.offset,
    page: Math.floor(response.offset / Math.max(response.limit, 1)) + 1,
    hasPreviousPage: response.offset > 0,
    hasNextPage: response.offset + response.limit < response.count,
  };
}

export function hasListeningAnswer(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function flattenListeningQuestions(detail: ListeningTestDetail): ListeningQuestionWithContext[] {
  return getListeningParts(detail).flatMap((part) =>
    part.questionBlocks.flatMap((block) =>
      block.questions.map((question) => ({
        partId: part.id,
        partTitle: part.title,
        partNumber: part.partNumber,
        blockId: block.id,
        blockTitle: block.title,
        blockType: block.blockType,
        answerSpec: block.answerSpec,
        question,
      }))
    )
  );
}

export function buildListeningSubmitPayload(
  detail: ListeningTestDetail,
  answers: ListeningDraftAnswers
): ListeningSubmitAnswerInput[] {
  return flattenListeningQuestions(detail).map((item) => ({
    id: item.question.id,
    value: answers[String(item.question.id)] ?? '',
  }));
}

export function findLatestUnfinishedListeningExamForTest(
  testId: number,
  exams: ListeningExamSummary[]
) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId && exam.status !== 'completed') {
      return exam;
    }
  }

  return null;
}

export function findLatestListeningExamForTest(testId: number, exams: ListeningExamSummary[]) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId) {
      return exam;
    }
  }

  return null;
}

export function findLatestCompletedListeningExamForTest(
  testId: number,
  exams: ListeningExamSummary[]
) {
  return (
    exams
      .filter((exam) => exam.testId === testId && Boolean(exam.finishedAt))
      .sort((left, right) => {
        const byFinishedAt =
          toDateTimestamp(right.finishedAt) - toDateTimestamp(left.finishedAt);
        if (byFinishedAt !== 0) {
          return byFinishedAt;
        }
        return right.id - left.id;
      })[0] ?? null
  );
}

export function resolveListeningRemainingTimeSeconds(
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

export function getListeningActiveExamId(testId: number) {
  const store = getListeningActiveExamsStore();
  const value = store[String(testId)];
  return typeof value === 'number' ? value : null;
}

export function setListeningActiveExam(testId: number, examId: number) {
  const store = getListeningActiveExamsStore();
  writeStorageItem(LISTENING_ACTIVE_EXAMS_STORAGE_KEY, {
    ...store,
    [String(testId)]: examId,
  });
}

export function clearListeningActiveExam(testId: number) {
  const store = getListeningActiveExamsStore();
  const nextStore = { ...store };
  delete nextStore[String(testId)];
  writeStorageItem(LISTENING_ACTIVE_EXAMS_STORAGE_KEY, nextStore);
}

export function getListeningDraftAnswers(examId: number): ListeningDraftAnswers {
  const store = getListeningDraftStore();
  const value = store[String(examId)];

  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, answer]) => typeof answer === 'string')
      .map(([questionId, answer]) => [questionId, answer])
  );
}

export function setListeningDraftAnswers(examId: number, answers: ListeningDraftAnswers) {
  const store = getListeningDraftStore();
  writeStorageItem(LISTENING_DRAFTS_STORAGE_KEY, {
    ...store,
    [String(examId)]: answers,
  });
}

export function clearListeningDraftAnswers(examId: number) {
  const store = getListeningDraftStore();
  const nextStore = { ...store };
  delete nextStore[String(examId)];
  writeStorageItem(LISTENING_DRAFTS_STORAGE_KEY, nextStore);
}
