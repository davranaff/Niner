export type SpeakingPartId = 'part1' | 'part2' | 'part3';

export type SpeakingSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'examiner_speaking'
  | 'user_listening'
  | 'waiting_for_user'
  | 'user_speaking'
  | 'silence_watch'
  | 'examiner_interrupted'
  | 'processing_turn_transition'
  | 'moving_on'
  | 'preparing_part2'
  | 'preparation_mode'
  | 'long_turn_listening'
  | 'discussion_mode'
  | 'closing'
  | 'reconnecting'
  | 'finished'
  | 'terminated';

export type SpeakingSpeaker = 'examiner' | 'user' | 'none';

export type SpeakingConnectionState =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export type SpeakingAttemptStatus =
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'terminated'
  | 'suspicious';

export type SpeakingIntegrityEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'route_leave'
  | 'refresh_attempt'
  | 'disconnect'
  | 'microphone_permission_lost';

export interface SpeakingCueCard {
  topic: string;
  prompt: string;
  bulletPoints: string[];
  notePrompt: string;
  preparationSeconds: number;
  targetAnswerSeconds: number;
}

export interface SpeakingQuestion {
  id: string;
  partId: SpeakingPartId;
  index: number;
  prompt: string;
  shortLabel: string;
  expectedAnswerSeconds: number;
  followUps: string[];
  rephrasePrompt?: string;
  cueCard?: SpeakingCueCard;
}

export interface SpeakingPart {
  id: SpeakingPartId;
  title: string;
  examinerGuidance: string;
  durationMinutes: number;
  questions: SpeakingQuestion[];
}

export interface SpeakingTestListItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  level: 'Academic' | 'General';
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface SpeakingTestDetail extends Omit<SpeakingTestListItem, 'isActive'> {
  instructions: string[];
  scoringFocus: string[];
  parts: SpeakingPart[];
}

export interface SpeakingTranscriptSegment {
  id: string;
  speaker: Exclude<SpeakingSpeaker, 'none'>;
  text: string;
  isFinal: boolean;
  startedAt: string;
  endedAt?: string;
  partId: SpeakingPartId;
  questionId: string;
  interrupted?: boolean;
  confidence?: number;
  source: 'speech-recognition' | 'speech-synthesis' | 'system';
}

export interface SpeakingTurn {
  id: string;
  speaker: Exclude<SpeakingSpeaker, 'none'>;
  partId: SpeakingPartId;
  questionId: string;
  startedAt: string;
  endedAt?: string;
  interrupted: boolean;
  transcriptSegmentIds: string[];
  status: 'active' | 'completed' | 'interrupted';
}

export interface SpeakingCriteriaScore {
  key: 'fluency' | 'lexical' | 'grammar' | 'pronunciation';
  label: string;
  band: number;
  rationale: string;
  evidence: string[];
}

export interface SpeakingPartSummary {
  partId: SpeakingPartId;
  title: string;
  summary: string;
  estimatedBand: number;
}

export interface SpeakingResult {
  sessionId: string;
  overallBand: number;
  criteria: SpeakingCriteriaScore[];
  strengths: string[];
  weaknesses: string[];
  examinerSummary: string;
  recommendations: string[];
  partSummaries: SpeakingPartSummary[];
  transcriptPreview: string[];
  sessionMetadata: {
    durationSeconds: number;
    transcriptWordCount: number;
    interruptionCount: number;
    silenceRecoveries: number;
  };
  integrityNotes: string[];
}

export interface SpeakingIntegrityEvent {
  id: string;
  type: SpeakingIntegrityEventType;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
  sessionStatus: SpeakingSessionStatus;
}

export interface SpeakingSession {
  id: string;
  testId: number;
  attemptId: string;
  title: string;
  status: SpeakingSessionStatus;
  connectionState: SpeakingConnectionState;
  currentSpeaker: SpeakingSpeaker;
  currentPartId: SpeakingPartId;
  currentQuestionIndex: number;
  askedQuestionIds: string[];
  noteDraft: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  prepRemainingSeconds: number;
  transcriptSegments: SpeakingTranscriptSegment[];
  turns: SpeakingTurn[];
  integrityEvents: SpeakingIntegrityEvent[];
  result?: SpeakingResult;
}

export interface SpeakingAttempt {
  id: string;
  examId: number;
  sessionId: string;
  testId: number;
  title: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  overallBand?: number;
  criteria: SpeakingCriteriaScore[];
  status: SpeakingAttemptStatus;
  integrityEvents: SpeakingIntegrityEvent[];
  result?: SpeakingResult;
  transcriptSegments: SpeakingTranscriptSegment[];
  questionIds: string[];
}

export interface SpeakingMicrophoneState {
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isActive: boolean;
  isMuted: boolean;
  level: number;
  noiseThreshold: number;
  silenceThresholdMs: number;
}

export interface SpeakingSpeakerOutputState {
  isEnabled: boolean;
  isSpeaking: boolean;
}

export interface SpeakingDiagnosticsState {
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  microphoneMessage: string;
  connectionMessage: string;
  lastEvent: string;
}

export interface SpeakingSessionSnapshot extends SpeakingSession {
  test: SpeakingTestDetail;
  currentQuestion: SpeakingQuestion;
  remainingQuestions: SpeakingQuestion[];
  liveExaminerTranscript: string;
  liveUserTranscript: string;
  microphone: SpeakingMicrophoneState;
  speakerOutput: SpeakingSpeakerOutputState;
  diagnostics: SpeakingDiagnosticsState;
  warnings: string[];
}

export type SpeakingAnswerAction =
  | 'continue_listening'
  | 'follow_up'
  | 'rephrase'
  | 'rescue_prompt'
  | 'gentle_redirect'
  | 'move_on'
  | 'soft_cutoff'
  | 'transition_to_next_topic'
  | 'transition_to_next_part'
  | 'discard_echo';

export interface SpeakingAnswerEvaluation {
  action: SpeakingAnswerAction;
  reason: string;
  cleanedTranscript: string;
  hasRealAnswer: boolean;
  isEchoLeak: boolean;
  isRelevant: boolean;
  isShort: boolean;
  isIncomplete: boolean;
  isRescueNeeded: boolean;
  isRedirectNeeded: boolean;
  isTooLong: boolean;
  overlapRatio: number;
  wordCount: number;
}

export interface SpeakingTurnInstruction {
  kind:
    | 'examiner_prompt'
    | 'prepare_part2'
    | 'follow_up'
    | 'reprompt'
    | 'rescue_prompt'
    | 'gentle_redirect'
    | 'move_on'
    | 'finish';
  text: string;
  question: SpeakingQuestion;
}
