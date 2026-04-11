import { localStorageAvailable } from 'src/utils/storage-available';

import type {
  BackendExamPublic,
  BackendOffsetPage,
  BackendReadingAnswerSpec,
  BackendReadingBlock,
  BackendReadingListItem,
  BackendReadingPart,
  BackendReadingQuestion,
  BackendReadingOption,
  BackendReadingSubmitResult,
  BackendReadingTestDetail,
  ReadingAnswerSpec,
  ReadingDraftAnswers,
  ReadingExamPage,
  ReadingExamSummary,
  ReadingListItem,
  ReadingListPage,
  ReadingListRequestParams,
  ReadingPart,
  ReadingQuestion,
  ReadingQuestionOption,
  ReadingQuestionWithContext,
  ReadingStoredResult,
  ReadingStoredResultAnswer,
  ReadingSubmitAnswerInput,
  ReadingTestDetail,
} from './types';

export const READING_LIST_DEFAULT_PAGE_SIZE = 12;
export const READING_EXAMS_LOOKUP_LIMIT = 100;

const SECONDS_IN_MINUTE = 60;

const READING_ACTIVE_EXAMS_STORAGE_KEY = 'student-reading-active-exams';
const READING_DRAFTS_STORAGE_KEY = 'student-reading-drafts';
const READING_RESULTS_STORAGE_KEY = 'student-reading-results';

type ReadingActiveExamsStore = Record<string, number>;
type ReadingDraftStore = Record<string, ReadingDraftAnswers>;
type ReadingResultsStore = Record<string, ReadingStoredResult>;

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

function getReadingActiveExamsStore() {
  const store = readStorageItem<ReadingActiveExamsStore>(READING_ACTIVE_EXAMS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function getReadingDraftStore() {
  const store = readStorageItem<ReadingDraftStore>(READING_DRAFTS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function getReadingResultsStore() {
  const store = readStorageItem<ReadingResultsStore>(READING_RESULTS_STORAGE_KEY);

  return store && typeof store === 'object' ? store : {};
}

function toReadingQuestionOption(option: BackendReadingOption): ReadingQuestionOption {
  return {
    id: option.id,
    optionText: option.optionText,
    order: option.order,
  };
}

function toReadingQuestion(question: BackendReadingQuestion): ReadingQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    order: question.order,
    number: question.number,
    answerType: question.answerType,
    inputVariant: question.inputVariant,
    options: question.options.map(toReadingQuestionOption),
  };
}

function toReadingAnswerSpec(spec: BackendReadingAnswerSpec): ReadingAnswerSpec {
  return {
    answerType: spec.answerType,
    inputVariant: spec.inputVariant,
    optionsMode: spec.optionsMode ?? null,
    maxWords: spec.maxWords ?? null,
  };
}

function toReadingBlock(block: BackendReadingBlock) {
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    blockType: block.blockType,
    order: block.order,
    answerSpec: toReadingAnswerSpec(block.answerSpec),
    questions: block.questions.map(toReadingQuestion),
    questionHeading: block.questionHeading ?? null,
    listOfHeadings: block.listOfHeadings ?? null,
    tableJson: block.tableJson ?? null,
    flowChartCompletion: block.flowChartCompletion ?? null,
  };
}

function toReadingPart(part: BackendReadingPart): ReadingPart {
  return {
    id: part.id,
    title: part.title,
    content: part.content,
    passageNumber: part.passageNumber,
    partNumber: part.partNumber,
    questionBlocks: part.questionBlocks.map(toReadingBlock),
    questionsCount: part.questionsCount,
  };
}

/** Cumulative list: `offset` 0, `limit` = batches × `batchSize` (URL `page` = batch count, min 1). */
export function buildReadingListRequestParams(
  loadedBatchCount: number,
  batchSize: number
): ReadingListRequestParams {
  const batches = Math.max(1, loadedBatchCount);
  return {
    offset: 0,
    limit: batches * batchSize,
  };
}

export function toReadingListItem(item: BackendReadingListItem): ReadingListItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    timeLimit: item.timeLimit,
    durationMinutes: Math.max(1, Math.ceil(item.timeLimit / SECONDS_IN_MINUTE)),
    isActive: item.isActive,
    createdAt: item.createdAt,
  };
}

export function toReadingListPage(
  response: BackendOffsetPage<BackendReadingListItem>
): ReadingListPage {
  const items = response.items.map(toReadingListItem);

  return {
    items,
    limit: response.limit,
    offset: response.offset,
    page: Math.floor(response.offset / Math.max(response.limit, 1)) + 1,
    hasPreviousPage: response.offset > 0,
    hasNextPage: items.length === response.limit,
  };
}

export function toReadingTestDetail(response: BackendReadingTestDetail): ReadingTestDetail {
  const passages = response.passages.map(toReadingPart);
  const parts = response.parts.map(toReadingPart);

  return {
    id: response.id,
    title: response.title,
    description: response.description,
    timeLimit: response.timeLimit,
    createdAt: response.createdAt,
    passages,
    parts,
  };
}

export function getReadingPassages(detail: ReadingTestDetail) {
  return detail.passages.length ? detail.passages : detail.parts;
}

export function getReadingParts(detail: ReadingTestDetail) {
  return getReadingPassages(detail);
}

export function getReadingTotalQuestions(detail: ReadingTestDetail) {
  return getReadingPassages(detail).reduce(
    (total, passage) => total + passage.questionsCount,
    0
  );
}

export function getReadingTimeLimit(detail: ReadingTestDetail) {
  return detail.timeLimit;
}

export function toReadingExamSummary(exam: BackendExamPublic): ReadingExamSummary {
  let status: ReadingExamSummary['status'] = 'not_started';

  if (exam.finishedAt) {
    status = 'completed';
  } else if (exam.startedAt) {
    status = 'in_progress';
  }

  return {
    ...exam,
    kind: 'reading',
    status,
  };
}

export function toReadingExamPage(response: BackendOffsetPage<BackendExamPublic>): ReadingExamPage {
  return {
    ...response,
    items: response.items
      .filter((item): item is BackendExamPublic & { kind: 'reading' } => item.kind === 'reading')
      .map(toReadingExamSummary),
  };
}

export function hasReadingAnswer(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function flattenReadingQuestions(detail: ReadingTestDetail): ReadingQuestionWithContext[] {
  return getReadingPassages(detail).flatMap((passage) =>
    passage.questionBlocks.flatMap((block) =>
      block.questions.map((question) => ({
        partId: passage.id,
        partTitle: passage.title,
        passageNumber: passage.passageNumber,
        blockId: block.id,
        blockTitle: block.title,
        blockType: block.blockType,
        answerSpec: block.answerSpec,
        question,
      }))
    )
  );
}

export function buildReadingQuestionContextMap(detail: ReadingTestDetail) {
  return new Map(flattenReadingQuestions(detail).map((item) => [item.question.id, item]));
}

export function buildReadingSubmitPayload(
  detail: ReadingTestDetail,
  answers: ReadingDraftAnswers
): ReadingSubmitAnswerInput[] {
  return flattenReadingQuestions(detail).map((item) => ({
    id: item.question.id,
    value: answers[String(item.question.id)] ?? '',
  }));
}

export function findReadingExamById(exams: ReadingExamSummary[], examId?: number | null) {
  if (!examId) {
    return null;
  }

  return exams.find((item) => item.id === examId) ?? null;
}

export function findLatestUnfinishedReadingExamForTest(
  testId: number,
  exams: ReadingExamSummary[]
) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId && exam.status !== 'completed') {
      return exam;
    }
  }

  return null;
}

export function findLatestReadingExamForTest(testId: number, exams: ReadingExamSummary[]) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId) {
      return exam;
    }
  }

  return null;
}

export function resolveReadingRemainingTimeSeconds(
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

export function resolveReadingFinishReason(
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

export function getReadingActiveExamId(testId: number) {
  const store = getReadingActiveExamsStore();
  const value = store[String(testId)];

  return typeof value === 'number' ? value : null;
}

export function setReadingActiveExam(testId: number, examId: number) {
  const store = getReadingActiveExamsStore();

  writeStorageItem(READING_ACTIVE_EXAMS_STORAGE_KEY, {
    ...store,
    [String(testId)]: examId,
  });
}

export function clearReadingActiveExam(testId: number) {
  const store = getReadingActiveExamsStore();
  const nextStore = { ...store };

  delete nextStore[String(testId)];

  writeStorageItem(READING_ACTIVE_EXAMS_STORAGE_KEY, nextStore);
}

export function getReadingDraftAnswers(examId: number): ReadingDraftAnswers {
  const store = getReadingDraftStore();
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

export function setReadingDraftAnswers(examId: number, answers: ReadingDraftAnswers) {
  const store = getReadingDraftStore();

  writeStorageItem(READING_DRAFTS_STORAGE_KEY, {
    ...store,
    [String(examId)]: answers,
  });
}

export function clearReadingDraftAnswers(examId: number) {
  const store = getReadingDraftStore();
  const nextStore = { ...store };

  delete nextStore[String(examId)];

  writeStorageItem(READING_DRAFTS_STORAGE_KEY, nextStore);
}

export function getReadingStoredResult(examId: number) {
  const store = getReadingResultsStore();
  const value = store[String(examId)];

  return value ?? null;
}

export function setReadingStoredResult(result: ReadingStoredResult) {
  const store = getReadingResultsStore();

  writeStorageItem(READING_RESULTS_STORAGE_KEY, {
    ...store,
    [String(result.examId)]: result,
  });
}

export function findLatestStoredReadingResultForTest(testId: number) {
  const store = Object.values(getReadingResultsStore());

  return store
    .filter((item) => item.testId === testId)
    .sort((left, right) => right.examId - left.examId)[0] ?? null;
}

function toStoredResultAnswer(
  answer: BackendReadingSubmitResult['answers'][number],
  questionContext: ReadingQuestionWithContext | undefined
): ReadingStoredResultAnswer {
  return {
    id: answer.id,
    questionId: answer.question,
    questionNumber: answer.questionNumber ?? questionContext?.question.number ?? 0,
    prompt: questionContext?.question.questionText ?? '',
    questionType: questionContext?.blockType ?? '',
    partTitle: questionContext?.partTitle ?? '',
    blockTitle: questionContext?.blockTitle ?? '',
    userAnswer: answer.userAnswer,
    correctAnswer: answer.correctAnswer,
    isCorrect: answer.isCorrect,
  };
}

export function toReadingStoredResult(params: {
  exam: ReadingExamSummary;
  detail: ReadingTestDetail;
  submitResult: BackendReadingSubmitResult;
  finishedAt?: string;
}) {
  const { detail, exam, submitResult } = params;
  const finishedAt = params.finishedAt ?? new Date().toISOString();
  const questionContextMap = buildReadingQuestionContextMap(detail);

  const answers = submitResult.answers
    .map((item) => toStoredResultAnswer(item, questionContextMap.get(item.question)))
    .sort((left, right) => left.questionNumber - right.questionNumber);

  return {
    examId: exam.id,
    testId: detail.id,
    testTitle: detail.title,
    testDescription: detail.description,
    submittedAt: finishedAt,
    finishReason: resolveReadingFinishReason(exam.startedAt, detail.timeLimit, finishedAt),
    score: submitResult.score,
    correctAnswers:
      submitResult.correctAnswers ?? answers.filter((item) => item.isCorrect).length,
    totalQuestions: getReadingTotalQuestions(detail),
    timeSpent: submitResult.timeSpent,
    answers,
  } satisfies ReadingStoredResult;
}
