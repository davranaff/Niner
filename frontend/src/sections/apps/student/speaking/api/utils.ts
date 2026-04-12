import { localStorageAvailable } from 'src/utils/storage-available';

import {
  SPEAKING_ACTIVE_EXAMS_STORAGE_KEY,
  SPEAKING_RECENT_ATTEMPTS_STORAGE_KEY,
} from '../constants';
import type {
  SpeakingAttempt,
  SpeakingPart,
  SpeakingQuestion,
  SpeakingSession,
  SpeakingSessionSnapshot,
  SpeakingTestDetail,
  SpeakingTestListItem,
} from '../types';
import type {
  BackendExamPublic,
  BackendOffsetPage,
  SpeakingActiveExamsStore,
  SpeakingExamPage,
  SpeakingExamSummary,
  SpeakingListPage,
  SpeakingListRequestParams,
  SpeakingQuestionIndex,
  SpeakingRecentAttemptsStore,
} from './types';

const SECONDS_IN_MINUTE = 60;

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

function getSpeakingActiveExamsStore() {
  const store = readStorageItem<SpeakingActiveExamsStore>(SPEAKING_ACTIVE_EXAMS_STORAGE_KEY);
  return store && typeof store === 'object' ? store : {};
}

function getSpeakingRecentAttemptsStore() {
  const store = readStorageItem<SpeakingRecentAttemptsStore>(SPEAKING_RECENT_ATTEMPTS_STORAGE_KEY);
  return store && typeof store === 'object' ? store : {};
}

/** Cumulative list: `offset` 0, `limit` = batches × `batchSize` (URL `page` = batch count, min 1). */
export function buildSpeakingListRequestParams(
  loadedBatchCount: number,
  batchSize: number
): SpeakingListRequestParams {
  const batches = Math.max(1, loadedBatchCount);

  return {
    offset: 0,
    limit: batches * batchSize,
  };
}

export function toSpeakingListItem(item: SpeakingTestListItem): SpeakingTestListItem {
  return {
    ...item,
    durationMinutes: Math.max(1, item.durationMinutes),
  };
}

export function toSpeakingListPage(
  response: BackendOffsetPage<SpeakingTestListItem>
): SpeakingListPage {
  const items = response.items.map(toSpeakingListItem);

  return {
    items,
    limit: response.limit,
    offset: response.offset,
    page: Math.floor(response.offset / Math.max(response.limit, 1)) + 1,
    hasPreviousPage: response.offset > 0,
    hasNextPage: items.length === response.limit,
  };
}

export function toSpeakingExamSummary(exam: BackendExamPublic): SpeakingExamSummary {
  let status: SpeakingExamSummary['status'] = 'not_started';

  if (exam.finishedAt) {
    status = 'completed';
  } else if (exam.startedAt) {
    status = 'in_progress';
  }

  return {
    ...exam,
    kind: 'speaking',
    status,
  };
}

export function toSpeakingExamPage(response: BackendOffsetPage<BackendExamPublic>): SpeakingExamPage {
  return {
    ...response,
    items: response.items
      .filter((item): item is BackendExamPublic & { kind: 'speaking' } => item.kind === 'speaking')
      .map(toSpeakingExamSummary),
  };
}

export function findSpeakingExamById(exams: SpeakingExamSummary[], examId?: number | null) {
  if (!examId) {
    return null;
  }

  return exams.find((item) => item.id === examId) ?? null;
}

export function findLatestUnfinishedSpeakingExamForTest(
  testId: number,
  exams: SpeakingExamSummary[]
) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId && exam.status !== 'completed') {
      return exam;
    }
  }

  return null;
}

export function findLatestSpeakingExamForTest(testId: number, exams: SpeakingExamSummary[]) {
  for (let index = exams.length - 1; index >= 0; index -= 1) {
    const exam = exams[index];
    if (exam.testId === testId) {
      return exam;
    }
  }

  return null;
}

export function getSpeakingActiveExamId(testId: number): number | null {
  const store = getSpeakingActiveExamsStore();
  return store[String(testId)] ?? null;
}

export function setSpeakingActiveExam(testId: number, examId: number) {
  const store = getSpeakingActiveExamsStore();
  writeStorageItem(SPEAKING_ACTIVE_EXAMS_STORAGE_KEY, {
    ...store,
    [String(testId)]: examId,
  });
}

export function clearSpeakingActiveExam(testId: number) {
  const store = getSpeakingActiveExamsStore();
  if (!(String(testId) in store)) {
    return;
  }

  const next = { ...store };
  delete next[String(testId)];
  writeStorageItem(SPEAKING_ACTIVE_EXAMS_STORAGE_KEY, next);
}

export function setSpeakingRecentAttempt(attempt: SpeakingAttempt) {
  const store = getSpeakingRecentAttemptsStore();
  writeStorageItem(SPEAKING_RECENT_ATTEMPTS_STORAGE_KEY, {
    ...store,
    [String(attempt.examId)]: attempt,
  });
}

export function getSpeakingRecentAttempt(examId: number) {
  const store = getSpeakingRecentAttemptsStore();
  return store[String(examId)] ?? null;
}

export function resolveSpeakingDurationMinutes(durationSeconds: number) {
  return Math.max(1, Math.ceil(durationSeconds / SECONDS_IN_MINUTE));
}

export function flattenSpeakingQuestions(test: SpeakingTestDetail): SpeakingQuestion[] {
  return test.parts.flatMap((part) => part.questions);
}

export function buildSpeakingQuestionIndex(test: SpeakingTestDetail): SpeakingQuestionIndex {
  const byId: Record<string, SpeakingQuestion> = {};
  const partByQuestionId: Record<string, SpeakingPart> = {};
  const allQuestions = flattenSpeakingQuestions(test);

  allQuestions.forEach((question) => {
    byId[question.id] = question;
  });

  test.parts.forEach((part) => {
    part.questions.forEach((question) => {
      partByQuestionId[question.id] = part;
    });
  });

  return {
    allQuestions,
    byId,
    partByQuestionId,
  };
}

function resolveCurrentQuestion(
  session: SpeakingSession,
  index: SpeakingQuestionIndex
): SpeakingQuestion {
  if (!index.allQuestions.length) {
    throw new Error('Speaking test has no questions.');
  }

  const boundedIndex = Math.min(Math.max(session.currentQuestionIndex, 0), index.allQuestions.length - 1);
  return index.allQuestions[boundedIndex];
}

export function createSpeakingSessionSnapshot(
  session: SpeakingSession,
  test: SpeakingTestDetail
): SpeakingSessionSnapshot {
  const questionIndex = buildSpeakingQuestionIndex(test);
  const currentQuestion = resolveCurrentQuestion(session, questionIndex);

  return {
    ...session,
    test,
    currentQuestion,
    remainingQuestions: questionIndex.allQuestions.slice(session.currentQuestionIndex + 1),
    liveExaminerTranscript: '',
    liveUserTranscript: '',
    microphone: {
      permission: 'prompt',
      isActive: false,
      isMuted: false,
      level: 0,
      noiseThreshold: 0.028,
      silenceThresholdMs: 1400,
    },
    speakerOutput: {
      isEnabled: true,
      isSpeaking: false,
    },
    diagnostics: {
      speechRecognitionSupported: false,
      speechSynthesisSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
      microphoneMessage: 'Microphone has not started yet.',
      connectionMessage: 'Waiting to connect to the live speaking session.',
      lastEvent: 'Session created.',
    },
    warnings: [],
  };
}

export function buildPersistableSession(snapshot: SpeakingSessionSnapshot): SpeakingSession {
  return {
    id: snapshot.id,
    testId: snapshot.testId,
    attemptId: snapshot.attemptId,
    title: snapshot.title,
    status: snapshot.status,
    connectionState: snapshot.connectionState,
    currentSpeaker: snapshot.currentSpeaker,
    currentPartId: snapshot.currentPartId,
    currentQuestionIndex: snapshot.currentQuestionIndex,
    askedQuestionIds: snapshot.askedQuestionIds,
    noteDraft: snapshot.noteDraft,
    startedAt: snapshot.startedAt,
    updatedAt: snapshot.updatedAt,
    completedAt: snapshot.completedAt,
    elapsedSeconds: snapshot.elapsedSeconds,
    prepRemainingSeconds: snapshot.prepRemainingSeconds,
    transcriptSegments: snapshot.transcriptSegments,
    turns: snapshot.turns,
    integrityEvents: snapshot.integrityEvents,
    result: snapshot.result,
  };
}

export function getSpeakingTimeLimitSeconds(test: SpeakingTestDetail) {
  return Math.max(1, Math.floor(test.durationMinutes * 60));
}
