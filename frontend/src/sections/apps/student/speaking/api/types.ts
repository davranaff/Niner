import type {
  SpeakingAnswerEvaluation,
  SpeakingAttempt,
  SpeakingConnectionState,
  SpeakingIntegrityEvent,
  SpeakingPart,
  SpeakingQuestion,
  SpeakingResult,
  SpeakingSession,
  SpeakingSessionSnapshot,
  SpeakingSessionStatus,
  SpeakingSpeaker,
  SpeakingTestDetail,
  SpeakingTestListItem,
  SpeakingTurn,
} from '../types';

export type BackendOffsetPage<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  count?: number | null;
};

export type BackendExamPublic = {
  id: number;
  userId: number;
  startedAt: string | null;
  finishedAt: string | null;
  finishReason: string | null;
  testId: number;
  kind: 'reading' | 'listening' | 'writing' | 'speaking';
};

export type SpeakingExamStatus = 'not_started' | 'in_progress' | 'completed';

export type SpeakingExamSummary = BackendExamPublic & {
  kind: 'speaking';
  status: SpeakingExamStatus;
};

export type SpeakingExamPage = BackendOffsetPage<SpeakingExamSummary>;

export type SpeakingListRequestParams = {
  offset: number;
  limit: number;
};

export type SpeakingMyExamsRequestParams = {
  speakingOffset: number;
  limit: number;
};

export type BackendExamsMeResponse = {
  reading: BackendOffsetPage<BackendExamPublic>;
  listening: BackendOffsetPage<BackendExamPublic>;
  writing: BackendOffsetPage<BackendExamPublic>;
  speaking: BackendOffsetPage<BackendExamPublic>;
};

export type SpeakingListPage = {
  items: SpeakingTestListItem[];
  limit: number;
  offset: number;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type SpeakingCreateExamPayload = {
  testId: number;
};

export type SpeakingStartFlowPayload = {
  testId: number;
  examId?: number | null;
};

export type SpeakingSessionPersistPayload = {
  session: SpeakingSession;
};

export type SpeakingExaminerDecisionRequest = {
  session: SpeakingSession;
  evaluation: SpeakingAnswerEvaluation;
  metrics: {
    transcript: string;
    wordCount: number;
    durationMs: number;
    wasSilent: boolean;
    wasCutOff: boolean;
    followUpsUsed: number;
    silencePromptsUsed: number;
  };
};

export type SpeakingExaminerDecisionResponse = {
  kind:
    | 'examiner_prompt'
    | 'prepare_part2'
    | 'follow_up'
    | 'reprompt'
    | 'rescue_prompt'
    | 'gentle_redirect'
    | 'move_on'
    | 'finish';
  questionId: string;
  text: string;
  rationale: string;
  source: 'llm' | 'fallback';
};

export type SpeakingFinalizePayload = {
  session: SpeakingSession;
};

export type SpeakingTtsPayload = {
  text: string;
  voice?: string;
};

export type SpeakingRecentAttemptsStore = Record<string, SpeakingAttempt>;

export type SpeakingActiveExamsStore = Record<string, number>;

export interface SpeakingSessionStoreShape {
  id: string;
  testId: number;
  attemptId: string;
  title: string;
  status: SpeakingSessionStatus;
  connectionState: SpeakingConnectionState;
  currentSpeaker: SpeakingSpeaker;
  currentPartId: 'part1' | 'part2' | 'part3';
  currentQuestionIndex: number;
  askedQuestionIds: string[];
  noteDraft: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  prepRemainingSeconds: number;
  transcriptSegments: SpeakingSession['transcriptSegments'];
  turns: SpeakingTurn[];
  integrityEvents: SpeakingIntegrityEvent[];
  result?: SpeakingResult;
}

export type SpeakingPersistableSession = SpeakingSessionStoreShape;

export type SpeakingQuestionIndex = {
  allQuestions: SpeakingQuestion[];
  byId: Record<string, SpeakingQuestion>;
  partByQuestionId: Record<string, SpeakingPart>;
};

export type SpeakingSessionBootstrap = {
  test: SpeakingTestDetail;
  session: SpeakingSession;
  snapshot: SpeakingSessionSnapshot;
  examId: number;
};
