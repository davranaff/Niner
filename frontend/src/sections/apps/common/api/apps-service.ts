import { AUTH_USER_KEY } from 'src/auth/api/storage-keys';
import { localStorageAvailable } from 'src/utils/storage-available';
import { request } from 'src/utils/axios';
import type { Pagination } from 'src/hooks/api';
import {
  IELTS_ACTIVITIES,
  IELTS_ATTEMPTS,
  IELTS_INTEGRITY_EVENTS,
  IELTS_PASSAGES,
  IELTS_QUESTIONS,
  IELTS_STUDENTS,
  IELTS_TEACHERS,
  IELTS_TEST_SECTIONS,
  IELTS_TESTS,
  IELTS_WRITING_PROMPTS,
  IELTS_WRITING_SUBMISSIONS,
  type ActiveIeltsModule,
  type FinishReason,
  type MockActivity,
  type MockAttempt,
  type MockIntegrityEvent,
  type MockQuestion,
  type MockQuestionAnswerValue,
  type MockResult,
  type MockStore,
  type MockStudent,
  type MockTeacher,
  type MockTeacherStudentAnalytics,
  type MockTest,
  type MockWritingSubmission,
  type ModuleBandMap,
  type UserRole,
} from 'src/_mock/ielts';

import type {
  AttemptSummary,
  AppsListFilters,
  MyTestsFilters,
  PaginatedStudentAttempts,
  PaginatedTeacherStudents,
  PaginatedTests,
  SessionData,
  StudentAttemptsListItem,
  StudentDashboardData,
  StudentProfileData,
  TeacherAnalyticsData,
  TeacherDashboardData,
  TeacherStudentDetailsData,
  TeacherStudentsFilters,
  TestDetailsData,
  TestListItem,
} from './types';
import {
  countWords,
  evaluateQuestionAnswer,
  evaluateWritingSubmission,
  rawScoreToBand,
  scaleScoreToForty,
  stringifyAnswerValue,
  writingRubricToBand,
} from '../module-test/utils/scoring';

const STORAGE_KEY = 'ielts-mock-store-v3';
const MOCK_DELAY = 280;
const teacherApiUrls = {
  dashboard: '/api/v1/teacher/dashboard',
  analytics: '/api/v1/teacher/analytics',
  students: '/api/v1/teacher/students/insights',
  studentDetails: (studentId: string) => `/api/v1/teacher/students/${studentId}/insights`,
} as const;

type BackendTeacherModuleBands = {
  reading: number;
  listening: number;
  writing: number;
};

type BackendTeacherStudentAnalytics = {
  studentId: number;
  studentName: string;
  studentEmail: string;
  targetBand: number;
  latestBand: number;
  moduleBands: BackendTeacherModuleBands;
  attemptsCount: number;
  weakModule: ActiveIeltsModule;
  lastActivity: string | null;
  integrityFlag: boolean;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recentAttemptIds: string[];
};

type BackendTeacherAttemptSummary = {
  attemptId: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  module: 'reading' | 'listening' | 'writing' | 'speaking';
  testId: number;
  testTitle: string;
  status: 'in_progress' | 'completed' | 'terminated';
  finishReason: 'completed' | 'left' | 'time_is_up' | null;
  updatedAt: string | null;
  estimatedBand: number | null;
  timeLimitSeconds: number;
};

type BackendTeacherDashboardResponse = {
  teacher: {
    id: number;
    name: string;
    email: string;
  };
  totalStudents: number;
  activeStudents: number;
  averageOverallBand: number;
  averageModuleBands: BackendTeacherModuleBands;
  recentAttempts: BackendTeacherAttemptSummary[];
  studentsAtRisk: BackendTeacherStudentAnalytics[];
  topImprovers: BackendTeacherStudentAnalytics[];
  integrityAlerts: Array<{
    id: string;
    attemptId: string;
    studentId: number;
    studentName: string;
    module: string;
    severity: string;
    createdAt: string;
    description: string;
  }>;
  completionStats: {
    completed: number;
    terminated: number;
    inProgress: number;
  };
};

type BackendTeacherStudentsPageResponse = {
  results: BackendTeacherStudentAnalytics[];
  count: number;
  limit: number;
  offset: number;
};

type BackendTeacherStudentDetailsResponse = {
  student: {
    id: number;
    name: string;
    email: string;
    targetBand: number;
  };
  analytics: BackendTeacherStudentAnalytics;
  latestAttempts: BackendTeacherAttemptSummary[];
  writingSubmissions: Array<{
    id: string;
    attemptId: string;
    draftSavedAt: string | null;
    responses: Record<string, string>;
  }>;
  integrityEvents: Array<{
    id: string;
    attemptId: string;
    type: string;
    severity: string;
    createdAt: string;
    description: string;
  }>;
};

type BackendTeacherAnalyticsResponse = {
  averageOverallBand: number;
  averageModuleBands: BackendTeacherModuleBands;
  weakAreas: Array<{ label: string; count: number }>;
  questionTypeIssues: Array<{ label: string; count: number }>;
  completionVsTermination: {
    completed: number;
    terminated: number;
  };
  atRiskStudents: BackendTeacherStudentAnalytics[];
};

const PASSAGE_BY_ID = new Map(IELTS_PASSAGES.map((passage) => [passage.id, passage]));
const TEST_BY_ID = new Map(IELTS_TESTS.map((test) => [test.id, test]));

function wait(ms = MOCK_DELAY) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), ms);
  });
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createStoreSeed(): MockStore {
  return {
    students: cloneValue(IELTS_STUDENTS),
    teachers: cloneValue(IELTS_TEACHERS),
    attempts: cloneValue(IELTS_ATTEMPTS),
    writingSubmissions: cloneValue(IELTS_WRITING_SUBMISSIONS),
    integrityEvents: cloneValue(IELTS_INTEGRITY_EVENTS),
    activities: cloneValue(IELTS_ACTIVITIES),
  };
}

function notNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

function readStore(): MockStore {
  if (!localStorageAvailable()) {
    return createStoreSeed();
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const nextStore = createStoreSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  }

  try {
    return JSON.parse(stored) as MockStore;
  } catch (error) {
    const nextStore = createStoreSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    return nextStore;
  }
}

function writeStore(store: MockStore) {
  if (!localStorageAvailable()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function withStore<T>(updater: (store: MockStore) => T) {
  const store = readStore();
  const result = updater(store);
  writeStore(store);
  return result;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function compareDateDesc(left?: string, right?: string) {
  return new Date(right || 0).getTime() - new Date(left || 0).getTime();
}

function formatModuleLabel(module: ActiveIeltsModule) {
  if (module === 'reading') return 'Reading';
  if (module === 'listening') return 'Listening';
  return 'Writing';
}

function getCurrentAuthRecord() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as { id?: string; role?: UserRole; email?: string }) : null;
  } catch (error) {
    return null;
  }
}

function getCurrentRole() {
  return getCurrentAuthRecord()?.role || 'student';
}

function findStudent(store: MockStore, studentId: string) {
  return store.students.find((student) => student.id === studentId) || null;
}

function getCurrentStudent(store: MockStore) {
  const auth = getCurrentAuthRecord();
  if (auth?.id) {
    const byId = findStudent(store, auth.id);
    if (byId) return byId;
  }

  if (auth?.email) {
    return store.students.find((student) => student.email === auth.email) || store.students[0];
  }

  return store.students[0];
}

function getTest(testId: string) {
  const test = TEST_BY_ID.get(testId);
  if (!test) {
    throw new Error(`Test ${testId} not found`);
  }
  return test;
}

function getSectionsForTest(testId: string) {
  return IELTS_TEST_SECTIONS.filter((section) => section.testId === testId).sort(
    (a, b) => a.order - b.order
  );
}

function getQuestionsForTest(testId: string) {
  return IELTS_QUESTIONS.filter((question) => question.testId === testId).sort(
    (left, right) => left.number - right.number
  );
}

function getWritingPromptsForTest(testId: string) {
  return IELTS_WRITING_PROMPTS.filter((prompt) => prompt.testId === testId).sort(
    (left, right) => left.order - right.order
  );
}

function getAttemptsForStudent(store: MockStore, studentId: string) {
  return store.attempts
    .filter((attempt) => attempt.studentId === studentId)
    .sort((left, right) => compareDateDesc(left.updatedAt, right.updatedAt));
}

function getWritingSubmission(store: MockStore, attemptId: string) {
  return store.writingSubmissions.find((submission) => submission.attemptId === attemptId) || null;
}

function getAttemptTimeSpentSec(attempt: MockAttempt) {
  return Math.max(0, attempt.durationMinutes * 60 - attempt.remainingTimeSec);
}

function buildRecommendation(
  kind: MockResult['recommendations'][number]['kind'],
  severity: 'low' | 'medium' | 'high',
  title: string,
  description: string
) {
  return {
    id: createId('recommendation'),
    kind,
    severity,
    title,
    description,
  };
}

function resolveAnswerReviewStatus(
  hasSavedAnswer: boolean,
  correct: boolean,
  partial: boolean
): MockResult['answerReview'][number]['status'] {
  if (!hasSavedAnswer) return 'unanswered';
  if (correct) return 'correct';
  if (partial) return 'partial';
  return 'incorrect';
}

function resolveIntegrityDescription(eventType?: MockIntegrityEvent['type']) {
  if (eventType === 'route_leave') {
    return 'The exam route changed during an active attempt. The session was terminated.';
  }

  if (eventType === 'before_unload') {
    return 'The browser attempted to refresh or close during an active attempt. The session was terminated.';
  }

  if (eventType === 'window_blur') {
    return 'The exam window lost focus during an active attempt. The session was terminated.';
  }

  return 'The exam tab was hidden during an active attempt. The session was terminated.';
}

function ensureWritingSubmissionEvaluated(
  store: MockStore,
  attempt: MockAttempt,
  submission: MockWritingSubmission
) {
  if (submission.rubric) {
    return submission;
  }

  const prompts = getWritingPromptsForTest(attempt.testId);
  submission.rubric = evaluateWritingSubmission(submission.responses, prompts);
  submission.evaluatorSummary =
    'Mock evaluator review generated from rubric signals. Backend scoring can replace this summary later.';
  submission.submittedAt = submission.submittedAt || attempt.submittedAt || attempt.updatedAt;
  return submission;
}

function buildObjectiveResult(store: MockStore, attempt: MockAttempt): MockResult {
  const test = getTest(attempt.testId);
  const sections = getSectionsForTest(test.id);
  const questions = getQuestionsForTest(test.id);
  const integrityEvents = store.integrityEvents.filter((event) => event.attemptId === attempt.id);

  const answerReview = questions.map((question) => {
    const savedAnswer = attempt.answers[question.id];
    const evaluation = evaluateQuestionAnswer(question, savedAnswer?.value);
    const status = resolveAnswerReviewStatus(
      Boolean(savedAnswer),
      evaluation.correct,
      evaluation.partial
    );

    return {
      questionId: question.id,
      number: question.number,
      type: question.type,
      prompt: question.prompt,
      userAnswer: stringifyAnswerValue(savedAnswer?.value),
      correctAnswer: stringifyAnswerValue(question.correctAnswer),
      status,
      explanation: question.explanation,
    };
  });

  const rawScore = answerReview.filter((item) => item.status === 'correct').length;
  const scaledRawScore = scaleScoreToForty(rawScore, questions.length);
  const estimatedBand = rawScoreToBand(scaledRawScore);

  const sectionBreakdown = sections.map((section) => {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.id);
    const correct = sectionQuestions.filter(
      (question) => evaluateQuestionAnswer(question, attempt.answers[question.id]?.value).correct
    ).length;
    const accuracy = sectionQuestions.length
      ? Math.round((correct / sectionQuestions.length) * 100)
      : 0;
    return {
      sectionId: section.id,
      title: section.title,
      correct,
      total: sectionQuestions.length,
      accuracy,
      band: rawScoreToBand(scaleScoreToForty(correct, sectionQuestions.length)),
    };
  });

  const questionTypeMap = questions.reduce<Record<string, { correct: number; total: number }>>(
    (acc, question) => {
      const key = question.type;
      const current = acc[key] || { correct: 0, total: 0 };
      const evaluation = evaluateQuestionAnswer(question, attempt.answers[question.id]?.value);
      current.total += 1;
      current.correct += evaluation.correct ? 1 : 0;
      acc[key] = current;
      return acc;
    },
    {}
  );

  const questionTypeBreakdown = Object.entries(questionTypeMap).map(([type, stats]) => ({
    type: type as MockQuestion['type'],
    correct: stats.correct,
    total: stats.total,
  }));

  const strongestSection = [...sectionBreakdown].sort(
    (left, right) => right.accuracy - left.accuracy
  )[0];
  const weakestSection = [...sectionBreakdown].sort(
    (left, right) => left.accuracy - right.accuracy
  )[0];
  const weakestQuestionType = [...questionTypeBreakdown].sort(
    (left, right) => left.correct / left.total - right.correct / right.total
  )[0];

  const strengths = strongestSection
    ? [
        `${strongestSection.title} delivered the highest accuracy at ${strongestSection.accuracy}%.`,
        `The best score pattern came from ${formatModuleLabel(
          test.module
        )} evidence location and direct recall.`,
      ]
    : [];

  const weaknesses = [
    weakestSection
      ? `${weakestSection.title} was the weakest section with ${weakestSection.correct}/${weakestSection.total} correct.`
      : '',
    weakestQuestionType
      ? `${weakestQuestionType.type.replaceAll('_', ' ')} questions caused the most errors.`
      : '',
  ].filter(Boolean);

  const recommendations = [
    weakestSection
      ? buildRecommendation(
          'weak_section',
          'high',
          `Revisit ${weakestSection.title}`,
          `Accuracy in ${weakestSection.title} was ${weakestSection.accuracy}%. Focus the next review on that passage set.`
        )
      : null,
    weakestQuestionType
      ? buildRecommendation(
          'weak_question_type',
          'medium',
          `Drill ${weakestQuestionType.type.replaceAll('_', ' ')}`,
          `Practice more ${weakestQuestionType.type.replaceAll(
            '_',
            ' '
          )} items before the next full mock.`
        )
      : null,
    getAttemptTimeSpentSec(attempt) > attempt.durationMinutes * 60 * 0.85
      ? buildRecommendation(
          'time_management',
          'medium',
          'Tight time management',
          'This attempt used most of the available time. Add one timed review block this week.'
        )
      : null,
    integrityEvents.length
      ? buildRecommendation(
          'integrity',
          'high',
          'Integrity rule triggered',
          'A tab-leave event was recorded. Schedule the next mock in a distraction-free environment.'
        )
      : null,
  ].filter(Boolean) as MockResult['recommendations'];

  return {
    id: `result-${attempt.id}`,
    attemptId: attempt.id,
    testId: attempt.testId,
    module: attempt.module,
    studentId: attempt.studentId,
    rawScore,
    scaledRawScore,
    totalQuestions: questions.length,
    estimatedBand,
    finishReason: attempt.finishReason || 'manual_submit',
    timeSpentSec: getAttemptTimeSpentSec(attempt),
    sectionBreakdown,
    questionTypeBreakdown,
    strengths,
    weaknesses,
    summary:
      attempt.status === 'terminated'
        ? `The attempt ended early because of a strict integrity event. The saved answers still show usable weak-area signals for review.`
        : `${formatModuleLabel(test.module)} performance sits around band ${Math.round(
            estimatedBand
          )} with the strongest accuracy in ${
            strongestSection?.title || 'the best-performing section'
          }.`,
    recommendations,
    answerReview,
  };
}

function buildWritingResult(store: MockStore, attempt: MockAttempt): MockResult {
  const submission = getWritingSubmission(store, attempt.id);
  const prompts = getWritingPromptsForTest(attempt.testId);

  if (!submission) {
    return {
      id: `result-${attempt.id}`,
      attemptId: attempt.id,
      testId: attempt.testId,
      module: attempt.module,
      studentId: attempt.studentId,
      rawScore: 0,
      scaledRawScore: 0,
      totalQuestions: prompts.length,
      estimatedBand: 0,
      finishReason: attempt.finishReason || 'manual_submit',
      timeSpentSec: getAttemptTimeSpentSec(attempt),
      sectionBreakdown: [],
      questionTypeBreakdown: [],
      strengths: [],
      weaknesses: ['No writing submission was found for this attempt.'],
      summary: 'Writing result is unavailable because the submission record is missing.',
      recommendations: [
        buildRecommendation(
          'writing_criterion',
          'high',
          'Submission missing',
          'Create a valid writing submission before backend evaluation is connected.'
        ),
      ],
      answerReview: [],
    };
  }

  ensureWritingSubmissionEvaluated(store, attempt, submission);

  const rubric = submission.rubric || evaluateWritingSubmission(submission.responses, prompts);
  const estimatedBand = writingRubricToBand(rubric);
  const criteriaEntries = [
    ['Task Achievement / Response', rubric.taskAchievement],
    ['Coherence & Cohesion', rubric.coherence],
    ['Lexical Resource', rubric.lexicalResource],
    ['Grammar Range & Accuracy', rubric.grammarRangeAccuracy],
  ] as const;

  const strongCriteria = criteriaEntries
    .filter(([, value]) => value >= estimatedBand)
    .map(([label]) => label);
  const weakCriteria = criteriaEntries
    .filter(([, value]) => value < estimatedBand)
    .map(([label]) => label);

  const lowCoveragePrompts = prompts.filter(
    (prompt) => countWords(submission.responses[prompt.id] || '') < prompt.minWords
  );

  return {
    id: `result-${attempt.id}`,
    attemptId: attempt.id,
    testId: attempt.testId,
    module: attempt.module,
    studentId: attempt.studentId,
    rawScore: 0,
    scaledRawScore: 0,
    totalQuestions: prompts.length,
    estimatedBand,
    finishReason: attempt.finishReason || 'manual_submit',
    timeSpentSec: getAttemptTimeSpentSec(attempt),
    sectionBreakdown: [],
    questionTypeBreakdown: [],
    strengths: strongCriteria.map(
      (criterion) => `${criterion} is currently the most stable scoring area.`
    ),
    weaknesses: weakCriteria.map(
      (criterion) => `${criterion} needs more control to lift the overall band.`
    ),
    summary:
      submission.evaluatorSummary ||
      `The writing mock sits around band ${Math.round(
        estimatedBand
      )}. Task development is strongest where paragraph control and example support stay consistent.`,
    recommendations: [
      ...weakCriteria.map((criterion) =>
        buildRecommendation(
          'writing_criterion',
          criterion.includes('Grammar') ? 'high' : 'medium',
          `Improve ${criterion}`,
          `${criterion} is below the current overall writing band. Add one focused rewrite session after teacher review.`
        )
      ),
      ...lowCoveragePrompts.map((prompt) =>
        buildRecommendation(
          'time_management',
          'high',
          `${prompt.taskLabel} is under length`,
          `${prompt.taskLabel} is below the minimum word target. Add a timed planning split before the next attempt.`
        )
      ),
    ],
    answerReview: [],
    writingCriteria: rubric,
    writingSummary: submission.evaluatorSummary,
    essayPreview: submission.responses,
    strongCriteria,
    weakCriteria,
  };
}

function buildResult(store: MockStore, attempt: MockAttempt) {
  if (attempt.module === 'writing') {
    return buildWritingResult(store, attempt);
  }

  return buildObjectiveResult(store, attempt);
}

function buildAttemptSummary(store: MockStore, attempt: MockAttempt): AttemptSummary {
  const student = getStudentByIdOrThrow(store, attempt.studentId);

  return {
    attempt: cloneValue(attempt),
    test: cloneValue(getTest(attempt.testId)),
    student: cloneValue(student),
    result:
      attempt.status === 'completed' || attempt.status === 'terminated'
        ? buildResult(store, attempt)
        : null,
  };
}

function mapBackendFinishReasonToMock(
  value: BackendTeacherAttemptSummary['finishReason']
): FinishReason {
  if (value === 'time_is_up') {
    return 'timeout';
  }
  if (value === 'left') {
    return 'tab_switch';
  }
  return 'completed';
}

function buildSyntheticMockStudent(payload: {
  studentId: number;
  studentName: string;
  studentEmail: string;
  targetBand: number;
}): MockStudent {
  return {
    id: String(payload.studentId),
    name: payload.studentName,
    email: payload.studentEmail,
    role: 'student',
    teacherId: 'teacher',
    targetBand: payload.targetBand,
    currentEstimatedBand: payload.targetBand,
    weeklyStudyMinutes: 0,
    streakDays: 0,
    activePlan: {
      name: 'Teacher-linked',
      attemptsLimit: 0,
      attemptsUsed: 0,
      renewalDate: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  };
}

function buildSyntheticMockTest(payload: {
  module: ActiveIeltsModule;
  testId: number;
  testTitle: string;
  timeLimitSeconds: number;
}): MockTest {
  return {
    id: String(payload.testId),
    module: payload.module,
    title: payload.testTitle,
    description: payload.testTitle,
    overview: payload.testTitle,
    durationMinutes: Math.max(1, Math.ceil(payload.timeLimitSeconds / 60)),
    difficulty: 'intermediate',
    featured: false,
    tag: payload.module,
    questionCount: 0,
    sectionCount: 0,
    taskCount: payload.module === 'writing' ? 2 : 0,
    sectionIds: [],
    writingPromptIds: [],
    instructions: [],
  };
}

function toMockTeacherStudentAnalytics(
  item: BackendTeacherStudentAnalytics
): MockTeacherStudentAnalytics {
  return {
    studentId: String(item.studentId),
    studentName: item.studentName,
    studentEmail: item.studentEmail,
    targetBand: item.targetBand,
    latestBand: item.latestBand,
    moduleBands: {
      reading: item.moduleBands.reading,
      listening: item.moduleBands.listening,
      writing: item.moduleBands.writing,
    },
    attemptsCount: item.attemptsCount,
    weakModule: item.weakModule,
    lastActivity: item.lastActivity || new Date().toISOString(),
    integrityFlag: item.integrityFlag,
    strengths: item.strengths,
    weaknesses: item.weaknesses,
    recommendations: item.recommendations,
    recentAttemptIds: item.recentAttemptIds,
  };
}

function toAttemptSummaryFromBackend(
  item: BackendTeacherAttemptSummary
): AttemptSummary | null {
  if (item.module === 'speaking') {
    return null;
  }

  const module = item.module as ActiveIeltsModule;
  const attempt: MockAttempt = {
    id: item.attemptId,
    testId: String(item.testId),
    module,
    studentId: String(item.studentId),
    status: item.status,
    finishReason: mapBackendFinishReasonToMock(item.finishReason),
    startedAt: item.updatedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    submittedAt: item.status === 'in_progress' ? undefined : item.updatedAt || undefined,
    terminatedAt: item.status === 'terminated' ? item.updatedAt || undefined : undefined,
    durationMinutes: Math.max(1, Math.ceil(item.timeLimitSeconds / 60)),
    remainingTimeSec: 0,
    answers: {},
    integrityEventIds: [],
    autosaveCount: 0,
  };
  const student = buildSyntheticMockStudent({
    studentId: item.studentId,
    studentName: item.studentName,
    studentEmail: item.studentEmail,
    targetBand: item.estimatedBand || 6,
  });
  const test = buildSyntheticMockTest({
    module,
    testId: item.testId,
    testTitle: item.testTitle,
    timeLimitSeconds: item.timeLimitSeconds,
  });
  const result: MockResult | null =
    item.estimatedBand == null
      ? null
      : {
          id: `result-${item.attemptId}`,
          attemptId: item.attemptId,
          testId: String(item.testId),
          module,
          studentId: String(item.studentId),
          rawScore: 0,
          scaledRawScore: 0,
          totalQuestions: 0,
          estimatedBand: item.estimatedBand,
          finishReason: mapBackendFinishReasonToMock(item.finishReason),
          timeSpentSec: item.timeLimitSeconds,
          sectionBreakdown: [],
          questionTypeBreakdown: [],
          strengths: [],
          weaknesses: [],
          summary: 'Exam attempt summary generated from backend attempt record.',
          recommendations: [],
          answerReview: [],
        };

  return {
    attempt,
    test,
    student,
    result,
  };
}

function computeModuleBands(store: MockStore, studentId: string): ModuleBandMap {
  const attempts = getAttemptsForStudent(store, studentId);
  const empty: ModuleBandMap = {
    reading: 0,
    listening: 0,
    writing: 0,
  };

  return attempts.reduce<ModuleBandMap>((acc, attempt) => {
    if (
      acc[attempt.module] === 0 &&
      (attempt.status === 'completed' || attempt.status === 'terminated')
    ) {
      acc[attempt.module] = buildResult(store, attempt).estimatedBand;
    }
    return acc;
  }, empty);
}

function moduleBandEntries(moduleBands: ModuleBandMap) {
  return (Object.entries(moduleBands) as Array<[ActiveIeltsModule, number]>).filter(
    ([, value]) => value > 0
  );
}

function averageBand(moduleBands: ModuleBandMap) {
  const values = moduleBandEntries(moduleBands).map(([, value]) => value);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function findStrongestWeakestModule(moduleBands: ModuleBandMap) {
  const sorted = moduleBandEntries(moduleBands).sort((left, right) => left[1] - right[1]);

  return {
    weakest: sorted[0]?.[0] || 'reading',
    strongest: sorted[sorted.length - 1]?.[0] || 'reading',
  };
}

function buildHeatmap(student: MockStudent) {
  const totalCells = 28;
  return Array.from({ length: totalCells }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalCells - index - 1));
    const minutes =
      index % 5 === 0 ? 0 : ((student.weeklyStudyMinutes / 7) * ((index % 3) + 1)) / 2;
    return {
      date: date.toISOString(),
      minutes: Math.round(minutes),
    };
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): Pagination<T> {
  const start = Math.max(0, (page - 1) * pageSize);
  const results = items.slice(start, start + pageSize);
  const nextPage = start + pageSize < items.length ? page + 1 : null;
  const prevPage = page > 1 ? page - 1 : null;

  return {
    count: items.length,
    next: nextPage ? `?page=${nextPage}` : null,
    previous: prevPage ? `?page=${prevPage}` : null,
    results,
  };
}

function createTestListItem(store: MockStore, studentId: string, test: MockTest): TestListItem {
  const attempts = getAttemptsForStudent(store, studentId).filter(
    (attempt) => attempt.testId === test.id
  );
  const completedResults = attempts
    .filter((attempt) => attempt.status === 'completed' || attempt.status === 'terminated')
    .map((attempt) => buildResult(store, attempt));

  const inProgressAttempt = attempts.find((attempt) => attempt.status === 'in_progress') || null;
  const latestAttempt = attempts[0] || null;
  const bestResult = [...completedResults].sort(
    (left, right) => right.estimatedBand - left.estimatedBand
  )[0];

  return {
    ...cloneValue(test),
    attemptsCount: attempts.length,
    bestBand: bestResult?.estimatedBand || null,
    bestScore:
      bestResult?.scaledRawScore || (bestResult?.writingCriteria ? bestResult.estimatedBand : null),
    status: inProgressAttempt ? 'in_progress' : latestAttempt?.status || 'not_started',
    lastAttemptId: latestAttempt?.id || null,
    inProgressAttemptId: inProgressAttempt?.id || null,
  };
}

function createActivity(store: MockStore, activity: Omit<MockActivity, 'id' | 'createdAt'>) {
  store.activities.unshift({
    id: createId('activity'),
    createdAt: nowIso(),
    ...activity,
  });
}

function getStudentByIdOrThrow(store: MockStore, studentId: string) {
  const student = findStudent(store, studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }
  return student;
}

export function getStoredMockUsers() {
  return withStore((store) => ({
    students: cloneValue(store.students),
    teachers: cloneValue(store.teachers),
  }));
}

export function findMockUserByEmail(email: string) {
  return withStore((store) => {
    const normalized = email.trim().toLowerCase();
    return (
      store.students.find((student) => student.email.toLowerCase() === normalized) ||
      store.teachers.find((teacher) => teacher.email.toLowerCase() === normalized) ||
      null
    );
  });
}

export function registerMockStudent(input: { name: string; email: string; targetBand?: number }) {
  return withStore((store) => {
    const existing = store.students.find(
      (student) => student.email.toLowerCase() === input.email.trim().toLowerCase()
    );

    if (existing) {
      return cloneValue(existing);
    }

    const teacher = store.teachers[0];
    const student: MockStudent = {
      id: createId('student'),
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: 'student',
      teacherId: teacher.id,
      createdAt: nowIso(),
      targetBand: input.targetBand || 7,
      currentEstimatedBand: 0,
      weeklyStudyMinutes: 0,
      streakDays: 0,
      activePlan: {
        name: 'Starter Trial',
        attemptsLimit: 8,
        attemptsUsed: 0,
        renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      },
    };

    store.students.unshift(student);
    teacher.studentIds.unshift(student.id);

    return cloneValue(student);
  });
}

export function getDefaultDashboardPath(role?: UserRole) {
  return role === 'teacher' ? '/dashboard/teacher' : '/dashboard';
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const attempts = getAttemptsForStudent(store, student.id);
    const moduleBands = computeModuleBands(store, student.id);
    const { weakest, strongest } = findStrongestWeakestModule(moduleBands);

    return {
      student: cloneValue(student),
      estimatedOverallBand: averageBand(moduleBands),
      moduleBands,
      totalAttempts: attempts.length,
      completedTests: attempts.filter((attempt) => attempt.status === 'completed').length,
      inProgressTests: attempts.filter((attempt) => attempt.status === 'in_progress').length,
      weeklyStudyMinutes: student.weeklyStudyMinutes,
      currentStreak: student.streakDays,
      recentActivity: cloneValue(
        store.activities
          .filter((activity) => activity.studentId === student.id)
          .sort((left, right) => compareDateDesc(left.createdAt, right.createdAt))
          .slice(0, 5)
      ),
      recommendedNextStep: `Resume ${formatModuleLabel(
        weakest
      ).toLowerCase()} with the next strict mock.`,
      strongestArea: strongest,
      weakestArea: weakest,
      recentAttempts: attempts.slice(0, 4).map((attempt) => buildAttemptSummary(store, attempt)),
      activityHeatmap: buildHeatmap(student),
      moduleCards: [
        {
          module: 'reading',
          availableTests: IELTS_TESTS.filter((test) => test.module === 'reading').length,
          bestBand: moduleBands.reading || null,
          status: attempts.find((attempt) => attempt.module === 'reading')?.status || 'not_started',
        },
        {
          module: 'listening',
          availableTests: IELTS_TESTS.filter((test) => test.module === 'listening').length,
          bestBand: moduleBands.listening || null,
          status:
            attempts.find((attempt) => attempt.module === 'listening')?.status || 'not_started',
        },
        {
          module: 'writing',
          availableTests: IELTS_TESTS.filter((test) => test.module === 'writing').length,
          bestBand: moduleBands.writing || null,
          status: attempts.find((attempt) => attempt.module === 'writing')?.status || 'not_started',
        },
        { module: 'speaking', availableTests: 0, bestBand: null, status: 'coming_soon' },
      ],
      planSnapshot: cloneValue(student.activePlan),
    };
  });
}

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  const response = await request<BackendTeacherDashboardResponse>({
    method: 'GET',
    url: teacherApiUrls.dashboard,
  });

  const teacher: MockTeacher = {
    id: String(response.teacher.id),
    name: response.teacher.name,
    email: response.teacher.email,
    role: 'teacher',
    bio: '',
    studentIds: Array.from(
      new Set(
        [...response.studentsAtRisk, ...response.topImprovers].map((item) => String(item.studentId))
      )
    ),
    createdAt: new Date().toISOString(),
  };

  return {
    teacher,
    totalStudents: response.totalStudents,
    activeStudents: response.activeStudents,
    averageOverallBand: response.averageOverallBand,
    averageModuleBands: {
      reading: response.averageModuleBands.reading,
      listening: response.averageModuleBands.listening,
      writing: response.averageModuleBands.writing,
    },
    recentAttempts: response.recentAttempts
      .map((item) => toAttemptSummaryFromBackend(item))
      .filter((item): item is AttemptSummary => Boolean(item)),
    studentsAtRisk: response.studentsAtRisk.map(toMockTeacherStudentAnalytics),
    topImprovers: response.topImprovers.map(toMockTeacherStudentAnalytics),
    integrityAlerts: response.integrityAlerts.map((item) => ({
      id: item.id,
      attemptId: item.attemptId,
      studentId: String(item.studentId),
      type: 'route_leave',
      severity: item.severity === 'critical' ? 'high' : 'medium',
      createdAt: item.createdAt,
      description: item.description,
    })),
    completionStats: {
      completed: response.completionStats.completed,
      terminated: response.completionStats.terminated,
      inProgress: response.completionStats.inProgress,
    },
  };
}

export async function getModuleTests(
  module: ActiveIeltsModule,
  filters: AppsListFilters
): Promise<PaginatedTests> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const normalizedSearch = filters.search.trim().toLowerCase();
    const items = IELTS_TESTS.filter((test) => test.module === module)
      .map((test) => createTestListItem(store, student.id, test))
      .filter((item) => {
        if (normalizedSearch) {
          const haystack = `${item.title} ${item.description} ${item.tag}`.toLowerCase();
          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }

        if (filters.status && filters.status !== 'all' && item.status !== filters.status) {
          return false;
        }

        if (
          filters.difficulty &&
          filters.difficulty !== 'all' &&
          item.difficulty !== filters.difficulty
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (left, right) =>
          Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title)
      );

    return paginate(items, filters.page, filters.pageSize);
  });
}

export async function getTestById(
  module: ActiveIeltsModule,
  testId: string
): Promise<TestDetailsData> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const test = getTest(testId);

    if (test.module !== module) {
      throw new Error(`Test ${testId} does not belong to ${module}`);
    }

    const lastAttempt =
      getAttemptsForStudent(store, student.id).find((attempt) => attempt.testId === testId) || null;

    return {
      test: cloneValue(test),
      sections: cloneValue(getSectionsForTest(testId)),
      passages: cloneValue(
        getSectionsForTest(testId)
          .map((section) => (section.passageId ? PASSAGE_BY_ID.get(section.passageId) : null))
          .filter(notNull)
      ),
      questions: cloneValue(getQuestionsForTest(testId)),
      writingPrompts: cloneValue(getWritingPromptsForTest(testId)),
      lastAttempt: cloneValue(lastAttempt),
      lastResult:
        lastAttempt && (lastAttempt.status === 'completed' || lastAttempt.status === 'terminated')
          ? buildResult(store, lastAttempt)
          : null,
    };
  });
}

export async function startAttempt(testId: string): Promise<MockAttempt> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const test = getTest(testId);
    const existing = getAttemptsForStudent(store, student.id).find(
      (attempt) => attempt.testId === testId && attempt.status === 'in_progress'
    );

    if (existing) {
      return cloneValue(existing);
    }

    const sections = getSectionsForTest(testId);
    const attempt: MockAttempt = {
      id: createId('attempt'),
      testId,
      module: test.module,
      studentId: student.id,
      status: 'in_progress',
      startedAt: nowIso(),
      updatedAt: nowIso(),
      durationMinutes: test.durationMinutes,
      remainingTimeSec: test.durationMinutes * 60,
      currentSectionId: sections[0]?.id,
      answers: {},
      integrityEventIds: [],
      autosaveCount: 0,
    };

    store.attempts.unshift(attempt);
    student.activePlan.attemptsUsed += 1;

    if (test.module === 'writing') {
      store.writingSubmissions.unshift({
        id: createId('submission'),
        attemptId: attempt.id,
        studentId: student.id,
        responses: getWritingPromptsForTest(testId).reduce<Record<string, string>>(
          (acc, prompt) => {
            acc[prompt.id] = '';
            return acc;
          },
          {}
        ),
        wordCounts: getWritingPromptsForTest(testId).reduce<Record<string, number>>(
          (acc, prompt) => {
            acc[prompt.id] = 0;
            return acc;
          },
          {}
        ),
        draftSavedAt: nowIso(),
      });
    }

    createActivity(store, {
      studentId: student.id,
      module: test.module,
      title: `${formatModuleLabel(test.module)} session started`,
      description: `${test.title} is now in progress.`,
    });

    return cloneValue(attempt);
  });
}

export async function getAttemptById(attemptId: string): Promise<MockAttempt> {
  await wait();

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    return cloneValue(attempt);
  });
}

export async function getSessionData(attemptId: string): Promise<SessionData> {
  await wait();

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    const testData = {
      test: cloneValue(getTest(attempt.testId)),
      sections: cloneValue(getSectionsForTest(attempt.testId)),
      passages: cloneValue(
        getSectionsForTest(attempt.testId)
          .map((section) => (section.passageId ? PASSAGE_BY_ID.get(section.passageId) : null))
          .filter(notNull)
      ),
      questions: cloneValue(getQuestionsForTest(attempt.testId)),
      writingPrompts: cloneValue(getWritingPromptsForTest(attempt.testId)),
      lastAttempt: cloneValue(attempt),
      lastResult:
        attempt.status === 'completed' || attempt.status === 'terminated'
          ? buildResult(store, attempt)
          : null,
    };

    return {
      ...testData,
      attempt: cloneValue(attempt),
      writingSubmission: cloneValue(getWritingSubmission(store, attempt.id)),
    };
  });
}

export async function saveAttemptAnswer(input: {
  attemptId: string;
  questionId: string;
  value: MockQuestionAnswerValue;
  currentSectionId?: string;
  remainingTimeSec?: number;
}): Promise<MockAttempt> {
  await wait(180);

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === input.attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${input.attemptId} not found`);
    }

    attempt.answers[input.questionId] = {
      questionId: input.questionId,
      value: input.value,
      updatedAt: nowIso(),
    };
    attempt.updatedAt = nowIso();
    attempt.autosaveCount += 1;

    if (typeof input.remainingTimeSec === 'number') {
      attempt.remainingTimeSec = input.remainingTimeSec;
    }

    if (input.currentSectionId) {
      attempt.currentSectionId = input.currentSectionId;
    }

    return cloneValue(attempt);
  });
}

export async function syncAttemptHeartbeat(input: {
  attemptId: string;
  remainingTimeSec: number;
  currentSectionId?: string;
}): Promise<MockAttempt> {
  await wait(80);

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === input.attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${input.attemptId} not found`);
    }

    attempt.remainingTimeSec = input.remainingTimeSec;
    attempt.updatedAt = nowIso();

    if (input.currentSectionId) {
      attempt.currentSectionId = input.currentSectionId;
    }

    return cloneValue(attempt);
  });
}

function terminateAttemptInternal(
  store: MockStore,
  input: {
    attemptId: string;
    reason: FinishReason;
    eventType?: MockIntegrityEvent['type'];
    remainingTimeSec?: number;
  }
) {
  const attempt = store.attempts.find((item) => item.id === input.attemptId);

  if (!attempt) {
    throw new Error(`Attempt ${input.attemptId} not found`);
  }

  if (attempt.status !== 'in_progress') {
    return attempt;
  }

  attempt.status = input.reason === 'timeout' ? 'completed' : 'terminated';
  attempt.finishReason = input.reason;
  attempt.terminatedAt = nowIso();
  attempt.submittedAt = input.reason === 'timeout' ? nowIso() : attempt.submittedAt;
  attempt.updatedAt = nowIso();
  attempt.remainingTimeSec =
    typeof input.remainingTimeSec === 'number' ? input.remainingTimeSec : attempt.remainingTimeSec;

  if (input.reason === 'tab_switch') {
    const event: MockIntegrityEvent = {
      id: createId('integrity'),
      attemptId: attempt.id,
      studentId: attempt.studentId,
      type: input.eventType || 'visibility_hidden',
      severity: 'high',
      createdAt: nowIso(),
      description: resolveIntegrityDescription(input.eventType),
    };

    attempt.integrityEventIds.push(event.id);
    store.integrityEvents.unshift(event);

    createActivity(store, {
      studentId: attempt.studentId,
      module: attempt.module,
      title: `${formatModuleLabel(attempt.module)} session terminated`,
      description: 'An integrity event ended the attempt. Review is still available.',
    });
  } else {
    createActivity(store, {
      studentId: attempt.studentId,
      module: attempt.module,
      title: `${formatModuleLabel(attempt.module)} session ended`,
      description: 'Time expired. Analytics were generated from the saved answers.',
    });
  }

  return attempt;
}

export function terminateAttemptSync(input: {
  attemptId: string;
  reason: FinishReason;
  eventType?: MockIntegrityEvent['type'];
  remainingTimeSec?: number;
}) {
  return withStore((store) => cloneValue(terminateAttemptInternal(store, input)));
}

export async function terminateAttempt(input: {
  attemptId: string;
  reason: FinishReason;
  eventType?: MockIntegrityEvent['type'];
  remainingTimeSec?: number;
}): Promise<MockAttempt> {
  await wait(120);

  return withStore((store) => cloneValue(terminateAttemptInternal(store, input)));
}

export async function submitAttempt(input: {
  attemptId: string;
  remainingTimeSec: number;
}): Promise<MockAttempt> {
  await wait();

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === input.attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${input.attemptId} not found`);
    }

    attempt.status = 'completed';
    attempt.finishReason = 'manual_submit';
    attempt.submittedAt = nowIso();
    attempt.updatedAt = nowIso();
    attempt.remainingTimeSec = input.remainingTimeSec;

    if (attempt.module === 'writing') {
      const submission = getWritingSubmission(store, attempt.id);
      if (submission) {
        ensureWritingSubmissionEvaluated(store, attempt, submission);
        submission.submittedAt = attempt.submittedAt;
      }
    }

    createActivity(store, {
      studentId: attempt.studentId,
      module: attempt.module,
      title: `${formatModuleLabel(attempt.module)} result available`,
      description: `${getTest(attempt.testId).title} was submitted and analytics are ready.`,
    });

    return cloneValue(attempt);
  });
}

export async function getAttemptResult(attemptId: string): Promise<MockResult> {
  await wait();

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    return buildResult(store, attempt);
  });
}

export async function getStudentAttempts(
  filters: MyTestsFilters
): Promise<PaginatedStudentAttempts> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const search = filters.search.trim().toLowerCase();
    const items = getAttemptsForStudent(store, student.id)
      .map<StudentAttemptsListItem>((attempt) => ({
        attempt: cloneValue(attempt),
        test: cloneValue(getTest(attempt.testId)),
        result:
          attempt.status === 'completed' || attempt.status === 'terminated'
            ? buildResult(store, attempt)
            : null,
      }))
      .filter((item) => {
        if (search) {
          const haystack = `${item.test.title} ${item.attempt.module}`.toLowerCase();
          if (!haystack.includes(search)) {
            return false;
          }
        }

        if (filters.module && filters.module !== 'all' && item.attempt.module !== filters.module) {
          return false;
        }

        if (filters.status && filters.status !== 'all' && item.attempt.status !== filters.status) {
          return false;
        }

        return true;
      });

    return paginate(items, filters.page, filters.pageSize);
  });
}

export async function getStudentProfile(): Promise<StudentProfileData> {
  await wait();

  return withStore((store) => {
    const student = getCurrentStudent(store);
    const attempts = getAttemptsForStudent(store, student.id);
    const moduleBands = computeModuleBands(store, student.id);

    return {
      student: cloneValue(student),
      estimatedOverallBand: averageBand(moduleBands),
      moduleBands,
      totalAttempts: attempts.length,
      studyStreak: student.streakDays,
      weeklyStudyMinutes: student.weeklyStudyMinutes,
      recentAttempts: attempts.slice(0, 4).map((attempt) => buildAttemptSummary(store, attempt)),
      achievements: [
        'Completed first full mock',
        'Maintained a 6-day study streak',
        'Unlocked teacher feedback for writing',
      ],
    };
  });
}

export async function getTeacherStudents(
  filters: TeacherStudentsFilters
): Promise<PaginatedTeacherStudents> {
  const response = await request<BackendTeacherStudentsPageResponse>({
    method: 'GET',
    url: teacherApiUrls.students,
    params: {
      search: filters.search.trim() || undefined,
      weakModule: filters.weakModule && filters.weakModule !== 'all' ? filters.weakModule : undefined,
      integrity: filters.integrity && filters.integrity !== 'all' ? filters.integrity : undefined,
      limit: filters.pageSize,
      offset: Math.max(0, (filters.page - 1) * filters.pageSize),
    },
  });

  const nextPage = response.offset + response.limit < response.count ? filters.page + 1 : null;
  const prevPage = filters.page > 1 ? filters.page - 1 : null;

  return {
    count: response.count,
    next: nextPage ? `?page=${nextPage}` : null,
    previous: prevPage ? `?page=${prevPage}` : null,
    results: response.results.map(toMockTeacherStudentAnalytics),
  };
}

export async function getTeacherStudentById(studentId: string): Promise<TeacherStudentDetailsData> {
  const response = await request<BackendTeacherStudentDetailsResponse>({
    method: 'GET',
    url: teacherApiUrls.studentDetails(studentId),
  });

  const student: MockStudent = {
    ...buildSyntheticMockStudent({
      studentId: response.student.id,
      studentName: response.student.name,
      studentEmail: response.student.email,
      targetBand: response.student.targetBand,
    }),
    currentEstimatedBand: response.analytics.latestBand,
  };

  return {
    student,
    analytics: toMockTeacherStudentAnalytics(response.analytics),
    latestAttempts: response.latestAttempts
      .map((item) => toAttemptSummaryFromBackend(item))
      .filter((item): item is AttemptSummary => Boolean(item)),
    writingSubmissions: response.writingSubmissions.map((item) => ({
      id: item.id,
      attemptId: item.attemptId,
      studentId: String(response.student.id),
      responses: item.responses,
      wordCounts: Object.fromEntries(
        Object.entries(item.responses).map(([key, value]) => [key, countWords(value)])
      ),
      draftSavedAt: item.draftSavedAt || new Date().toISOString(),
      submittedAt: undefined,
      rubric: undefined,
      evaluatorSummary: undefined,
    })),
    integrityEvents: response.integrityEvents.map((item) => ({
      id: item.id,
      attemptId: item.attemptId,
      studentId: String(response.student.id),
      type: 'route_leave',
      severity: item.severity === 'critical' ? 'high' : 'medium',
      createdAt: item.createdAt,
      description: item.description,
    })),
  };
}

export async function getTeacherAnalytics(): Promise<TeacherAnalyticsData> {
  const response = await request<BackendTeacherAnalyticsResponse>({
    method: 'GET',
    url: teacherApiUrls.analytics,
  });

  return {
    averageOverallBand: response.averageOverallBand,
    averageModuleBands: {
      reading: response.averageModuleBands.reading,
      listening: response.averageModuleBands.listening,
      writing: response.averageModuleBands.writing,
    },
    weakAreas: response.weakAreas,
    questionTypeIssues: response.questionTypeIssues,
    completionVsTermination: response.completionVsTermination,
    atRiskStudents: response.atRiskStudents.map(toMockTeacherStudentAnalytics),
  };
}

export async function saveWritingDraft(input: {
  attemptId: string;
  promptId: string;
  content: string;
  remainingTimeSec?: number;
}): Promise<MockWritingSubmission> {
  await wait(180);

  return withStore((store) => {
    const attempt = store.attempts.find((item) => item.id === input.attemptId);
    if (!attempt) {
      throw new Error(`Attempt ${input.attemptId} not found`);
    }

    const submission = getWritingSubmission(store, input.attemptId);
    if (!submission) {
      throw new Error(`Writing submission for ${input.attemptId} not found`);
    }

    submission.responses[input.promptId] = input.content;
    submission.wordCounts[input.promptId] = countWords(input.content);
    submission.draftSavedAt = nowIso();
    attempt.updatedAt = nowIso();
    attempt.autosaveCount += 1;

    if (typeof input.remainingTimeSec === 'number') {
      attempt.remainingTimeSec = input.remainingTimeSec;
    }

    return cloneValue(submission);
  });
}

export async function getAttemptIntegrityEvents(attemptId: string): Promise<MockIntegrityEvent[]> {
  await wait(120);

  return withStore((store) =>
    cloneValue(store.integrityEvents.filter((event) => event.attemptId === attemptId))
  );
}

export function resetIeltsMockStore() {
  writeStore(createStoreSeed());
}

export function isTeacherRole() {
  return getCurrentRole() === 'teacher';
}
