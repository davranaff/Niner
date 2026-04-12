import {
  DEFAULT_SILENCE_THRESHOLD_MS,
  INTEGRITY_EVENT_MESSAGES,
  PART1_SILENCE_THRESHOLD_MS,
  PART2_SILENCE_THRESHOLD_MS,
  PART3_SILENCE_THRESHOLD_MS,
  SESSION_STATUS_LABELS,
} from '../constants';
import {
  clearSpeakingActiveExam,
  setSpeakingRecentAttempt,
} from '../api/utils';
import { SpeakingAudioInputController } from './speaking-audio-input-controller';
import { evaluateSpeakingAnswer } from './speaking-answer-evaluator';
import { SpeakingAudioOutputController } from './speaking-audio-output-controller';
import {
  isSpeakingBackendEnabled,
  requestExaminerDecision,
  SpeakingRealtimeTransportClient,
  mirrorFinalizedSession,
  mirrorPersistedSession,
  type SpeakingExaminerDecisionResponse,
} from './speaking-backend-sync';
import {
  SpeakingSessionStore,
} from './speaking-session-store';
import { buildPersistableSession } from './speaking-storage';
import { SpeakingTranscriptStream } from './speaking-transcript-stream';
import {
  SpeakingTurnManager,
  type SpeakingTurnCompletionMetrics,
} from './speaking-turn-manager';
import type {
  SpeakingAnswerEvaluation,
  SpeakingAttempt,
  SpeakingIntegrityEventType,
  SpeakingQuestion,
  SpeakingSessionSnapshot,
  SpeakingTurnInstruction,
} from '../types';
import { buildSpeakingResult } from '../utils/build-speaking-result';
import { createId } from '../utils/id';

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function microphoneMessageByPermission(permission: 'prompt' | 'granted' | 'denied' | 'unsupported') {
  if (permission === 'granted') {
    return 'Microphone is live and monitoring with a noise gate threshold.';
  }
  if (permission === 'denied') {
    return 'Microphone permission is unavailable.';
  }
  return 'Waiting for microphone permission.';
}

type SpeakingRealtimeSessionClientOptions = {
  examId: number;
  snapshot: SpeakingSessionSnapshot;
  onFinalized?: (attempt: SpeakingAttempt) => void;
};

export class SpeakingRealtimeSessionClient {
  readonly store: SpeakingSessionStore;

  private hasConnected = false;

  private isConnecting = false;

  private connectAttempt = 0;

  private turnManager: SpeakingTurnManager;

  private inputController: SpeakingAudioInputController;

  private outputController = new SpeakingAudioOutputController();

  private transcriptStream = new SpeakingTranscriptStream();

  private transport?: SpeakingRealtimeTransportClient;

  private elapsedTimerId?: number;

  private preparationTimerId?: number;

  private waitingForUserTimerId?: number;

  private userTurnBudgetTimerId?: number;

  private persistTimerId?: number;

  private destroyed = false;

  private finalizing = false;

  private lastExaminerPrompt = '';

  private lastExaminerSpeechEndedAtMs: number | null = null;

  private activeExaminerTurnId?: string;

  private activeUserTurnId?: string;

  private activeQuestionId?: string;

  private questionFollowUpsUsed = 0;

  private questionSilencePromptsUsed = 0;

  private cutInUserTurn = false;

  private readonly examId: number;

  private readonly onFinalized?: (attempt: SpeakingAttempt) => void;

  constructor(options: SpeakingRealtimeSessionClientOptions) {
    this.examId = options.examId;
    this.onFinalized = options.onFinalized;

    this.turnManager = new SpeakingTurnManager(options.snapshot.test);
    this.store = new SpeakingSessionStore(options.snapshot);

    this.inputController = new SpeakingAudioInputController({
      onLevel: (level) => {
        this.store.setState((state) => ({
          ...state,
          microphone: {
            ...state.microphone,
            level,
          },
        }));
      },
      onSpeechStart: () => {
        const state = this.store.getState();
        if (
          state.status === 'preparing_part2' ||
          state.status === 'preparation_mode' ||
          state.status === 'finished' ||
          state.status === 'terminated'
        ) {
          return;
        }

        this.syncSilenceThreshold();

        if (state.speakerOutput.isSpeaking) {
          this.interruptExaminer('Candidate speech detected. Examiner turn interrupted.');
        }

        this.clearWaitingForUserWatch();
        this.clearUserTurnBudget();
        this.cutInUserTurn = false;

        const turnId = createId('turn-user');
        this.activeUserTurnId = turnId;
        this.activeQuestionId = state.currentQuestion.id;

        this.store.setState((current) => ({
          ...current,
          status: current.currentQuestion.partId === 'part2' ? 'long_turn_listening' : 'user_speaking',
          currentSpeaker: 'user',
          liveUserTranscript: '',
          turns: [
            ...current.turns,
            {
              id: turnId,
              speaker: 'user',
              partId: current.currentQuestion.partId,
              questionId: current.currentQuestion.id,
              startedAt: new Date().toISOString(),
              interrupted: false,
              transcriptSegmentIds: [],
              status: 'active',
            },
          ],
          diagnostics: {
            ...current.diagnostics,
            lastEvent:
              current.currentQuestion.partId === 'part2'
                ? 'Candidate long turn in progress.'
                : 'Candidate turn started.',
          },
        }));

        this.scheduleUserTurnBudget();
      },
      onSpeechEnd: (text) => {
        this.handleUserSpeechEnd(text);
      },
      onTranscript: (text) => {
        this.store.setState((state) => ({
          ...state,
          liveUserTranscript: text,
        }));
      },
      onPermissionChange: (permission) => {
        this.store.setState((state) => ({
          ...state,
          microphone: {
            ...state.microphone,
            permission,
            isActive: permission === 'granted',
          },
          diagnostics: {
            ...state.diagnostics,
            microphoneMessage: microphoneMessageByPermission(permission),
          },
        }));

        if (permission === 'denied') {
          this.registerIntegrityEvent('microphone_permission_lost', 'critical');
        }
      },
      onRecognitionSupport: (supported) => {
        const unsupportedWarning = 'Live transcription is limited in this browser.';
        const {warnings: currentWarnings} = this.store.getState();
        let warnings = currentWarnings;
        if (supported) {
          warnings = warnings.filter((warning) => warning !== unsupportedWarning);
        } else if (!warnings.includes(unsupportedWarning)) {
          warnings = [...warnings, unsupportedWarning];
        }

        this.store.setState((state) => ({
          ...state,
          warnings,
          diagnostics: {
            ...state.diagnostics,
            speechRecognitionSupported: supported,
            microphoneMessage: supported
              ? state.diagnostics.microphoneMessage
              : 'Microphone is live, but browser speech recognition support is limited.',
          },
        }));
      },
      onError: (message) => {
        this.store.setState((state) => ({
          ...state,
          warnings: state.warnings.includes(message) ? state.warnings : [...state.warnings, message],
          diagnostics: {
            ...state.diagnostics,
            lastEvent: message,
          },
        }));
      },
    });

    if (isSpeakingBackendEnabled()) {
      this.transport = new SpeakingRealtimeTransportClient(this.examId, {
        onClose: () => {
          if (this.destroyed) {
            return;
          }

          this.store.setState((state) => ({
            ...state,
            diagnostics: {
              ...state.diagnostics,
              connectionMessage:
                state.status === 'finished' || state.status === 'terminated'
                  ? state.diagnostics.connectionMessage
                  : 'Realtime sync channel closed. The local exam session remains active.',
            },
          }));
        },
        onError: (message) => {
          this.store.setState((state) => ({
            ...state,
            warnings: state.warnings.includes(message) ? state.warnings : [...state.warnings, message],
            diagnostics: {
              ...state.diagnostics,
              lastEvent: message,
            },
          }));
        },
        onEvent: (event) => {
          if (event.type === 'server.connected' || event.type === 'server.keepalive') {
            this.store.setState((state) => ({
              ...state,
              diagnostics: {
                ...state.diagnostics,
                connectionMessage: 'Realtime sync channel is active.',
              },
            }));
          }
        },
        onOpen: () => {
          this.store.setState((state) => ({
            ...state,
            diagnostics: {
              ...state.diagnostics,
              connectionMessage: 'Realtime sync channel connected.',
            },
          }));
        },
      });
    }
  }

  getSnapshot() {
    return this.store.getState();
  }

  isTerminal() {
    const {status} = this.store.getState();
    return status === 'finished' || status === 'terminated';
  }

  async connect() {
    if (this.destroyed || this.hasConnected || this.isConnecting) {
      return;
    }

    const state = this.store.getState();
    if (state.status === 'finished' || state.status === 'terminated') {
      return;
    }

    this.connectAttempt += 1;
    const attempt = this.connectAttempt;
    this.isConnecting = true;

    this.commit((current) => ({
      ...current,
      status: 'connecting',
      connectionState: 'connecting',
      diagnostics: {
        ...current.diagnostics,
        connectionMessage: 'Connecting to the realtime speaking session.',
        lastEvent: 'Opening examiner channel.',
      },
    }));

    await wait(600);
    if (this.destroyed || attempt !== this.connectAttempt) {
      this.isConnecting = false;
      return;
    }

    this.commit((current) => ({
      ...current,
      status: 'connected',
      connectionState: 'connected',
      diagnostics: {
        ...current.diagnostics,
        connectionMessage: 'Connected. Examiner audio channel is ready.',
        lastEvent: 'Session connected.',
      },
    }));

    this.hasConnected = true;
    this.isConnecting = false;

    this.transport?.connect(buildPersistableSession(this.store.getState()));
    this.startElapsedTimer();
    await this.inputController.startMicrophone();
    if (this.destroyed || attempt !== this.connectAttempt) {
      return;
    }

    this.syncSilenceThreshold();

    const snapshot = this.store.getState();
    if (snapshot.askedQuestionIds.length === 0) {
      this.deliverInstruction(this.turnManager.beginSession());
      return;
    }

    if (
      (snapshot.status === 'preparing_part2' || snapshot.status === 'preparation_mode') &&
      snapshot.prepRemainingSeconds > 0
    ) {
      this.startPreparationCountdown(snapshot.prepRemainingSeconds);
      return;
    }

    if (
      snapshot.askedQuestionIds.length > 0 &&
      snapshot.currentSpeaker === 'none' &&
      snapshot.status !== 'finished' &&
      snapshot.status !== 'terminated'
    ) {
      this.deliverInstruction(this.turnManager.repeatCurrentQuestion(snapshot));
      return;
    }

    this.enterWaitingForUser('Session restored. Candidate response can continue.');
  }

  disconnect() {
    this.connectAttempt += 1;
    this.hasConnected = false;
    this.isConnecting = false;
    this.inputController.setExaminerPlaybackActive(false);
    this.outputController.interrupt();
    this.inputController.stopMicrophone();
    this.transport?.disconnect();
    this.clearTimers();
    this.commit((state) => ({
      ...state,
      connectionState: 'disconnected',
      status: state.status === 'finished' ? 'finished' : 'terminated',
      diagnostics: {
        ...state.diagnostics,
        connectionMessage: 'Live session closed.',
      },
    }));
  }

  muteMicrophone() {
    this.inputController.muteMicrophone();
    this.store.setState((state) => ({
      ...state,
      microphone: {
        ...state.microphone,
        isMuted: true,
      },
    }));
  }

  unmuteMicrophone() {
    this.inputController.unmuteMicrophone();
    this.store.setState((state) => ({
      ...state,
      microphone: {
        ...state.microphone,
        isMuted: false,
      },
    }));
  }

  toggleSpeakerOutput() {
    const nextEnabled = !this.store.getState().speakerOutput.isEnabled;
    this.outputController.setEnabled(nextEnabled);
    if (!nextEnabled) {
      this.interruptExaminer('Speaker output disabled. Examiner turn cleared.');
    }
    this.store.setState((state) => ({
      ...state,
      speakerOutput: {
        ...state.speakerOutput,
        isEnabled: nextEnabled,
        isSpeaking: nextEnabled ? state.speakerOutput.isSpeaking : false,
      },
    }));
  }

  async reconnect() {
    const snapshotBeforeReconnect = this.store.getState();
    this.hasConnected = false;
    this.isConnecting = false;
    this.registerIntegrityEvent('disconnect', 'warning');
    this.commit((state) => ({
      ...state,
      status: 'reconnecting',
      connectionState: 'reconnecting',
      diagnostics: {
        ...state.diagnostics,
        connectionMessage: 'Attempting to restore the realtime session.',
        lastEvent: 'Reconnect sequence started.',
      },
    }));

    await wait(900);
    if (this.destroyed) {
      return;
    }

    let restoredStatus: SpeakingSessionSnapshot['status'] = 'waiting_for_user';
    const currentStatus = snapshotBeforeReconnect.status;
    if (currentStatus === 'preparing_part2' || currentStatus === 'preparation_mode') {
      restoredStatus = 'preparation_mode';
    } else if (snapshotBeforeReconnect.currentPartId === 'part3') {
      restoredStatus = 'discussion_mode';
    }

    this.commit((state) => ({
      ...state,
      status: restoredStatus,
      connectionState: 'connected',
      currentSpeaker: 'none',
      diagnostics: {
        ...state.diagnostics,
        connectionMessage: 'Realtime connection restored.',
        lastEvent: 'Reconnect completed.',
      },
    }));

    if (this.store.getState().status === 'waiting_for_user' || this.store.getState().status === 'discussion_mode') {
      this.scheduleWaitingForUserWatch();
    }
  }

  repeatLastQuestion() {
    this.interruptExaminer('Last examiner turn cleared before repeating the prompt.');
    this.deliverInstruction(this.turnManager.repeatCurrentQuestion(this.store.getState()));
  }

  setNoiseThreshold(value: number) {
    this.inputController.setNoiseThreshold(value);
    this.store.setState((state) => ({
      ...state,
      microphone: {
        ...state.microphone,
        noiseThreshold: value,
      },
      diagnostics: {
        ...state.diagnostics,
        lastEvent: `Noise gate threshold adjusted to ${value.toFixed(3)}.`,
      },
    }));
  }

  updateNoteDraft(value: string) {
    this.commit((state) => ({
      ...state,
      noteDraft: value,
    }));
  }

  interruptExaminer(message = 'Examiner speech interrupted.') {
    const state = this.store.getState();
    if (!state.speakerOutput.isSpeaking) {
      return;
    }

    this.transcriptStream.cancel();
    this.inputController.setExaminerPlaybackActive(false, { interrupted: true });
    this.outputController.interrupt();
    this.lastExaminerSpeechEndedAtMs = performance.now();

    if (this.activeExaminerTurnId) {
      const segmentId = createId('segment-examiner');
      const text = state.liveExaminerTranscript.trim() || this.lastExaminerPrompt;

      this.commit((current) => ({
        ...current,
        status: 'examiner_interrupted',
        currentSpeaker: 'none',
        liveExaminerTranscript: '',
        speakerOutput: {
          ...current.speakerOutput,
          isSpeaking: false,
        },
        transcriptSegments: [
          ...current.transcriptSegments,
          {
            id: segmentId,
            speaker: 'examiner',
            text,
            isFinal: true,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            partId: current.currentQuestion.partId,
            questionId: current.currentQuestion.id,
            interrupted: true,
            source: 'speech-synthesis',
          },
        ],
        turns: current.turns.map((turn) =>
          turn.id === this.activeExaminerTurnId
            ? {
                ...turn,
                interrupted: true,
                endedAt: new Date().toISOString(),
                status: 'interrupted',
                transcriptSegmentIds: [...turn.transcriptSegmentIds, segmentId],
              }
            : turn
        ),
        diagnostics: {
          ...current.diagnostics,
          lastEvent: message,
        },
      }));

      this.activeExaminerTurnId = undefined;
    }
  }

  registerIntegrityEvent(type: SpeakingIntegrityEventType, severity: 'warning' | 'critical' = 'warning') {
    this.commit((state) => ({
      ...state,
      integrityEvents: [
        ...state.integrityEvents,
        {
          id: createId('integrity'),
          type,
          severity,
          message: INTEGRITY_EVENT_MESSAGES[type],
          createdAt: new Date().toISOString(),
          sessionStatus: state.status,
        },
      ],
      diagnostics: {
        ...state.diagnostics,
        lastEvent: INTEGRITY_EVENT_MESSAGES[type],
      },
    }));
  }

  async endExam(reason: 'manual' | 'integrity' = 'manual') {
    if (this.finalizing) {
      return;
    }

    this.finalizing = true;

    this.clearTimers();
    this.inputController.setExaminerPlaybackActive(false);
    this.outputController.interrupt();
    this.transcriptStream.cancel();
    this.transport?.disconnect();

    const completedAt = new Date().toISOString();
    const baseState = this.store.getState();
    const fallbackResult = baseState.result ?? buildSpeakingResult(baseState, baseState.test);

    this.commit((state) => ({
      ...state,
      status: reason === 'manual' ? 'finished' : 'terminated',
      currentSpeaker: 'none',
      completedAt,
      connectionState: 'disconnected',
      liveExaminerTranscript: '',
      liveUserTranscript: '',
      speakerOutput: {
        ...state.speakerOutput,
        isSpeaking: false,
      },
      result: fallbackResult,
      diagnostics: {
        ...state.diagnostics,
        connectionMessage: 'The speaking session has ended.',
        lastEvent:
          reason === 'manual'
            ? 'Exam finished by the candidate.'
            : 'Session terminated by integrity controls.',
      },
    }));

    const finalizedSnapshot = this.store.getState();

    try {
      const attempt = await mirrorFinalizedSession(this.examId, finalizedSnapshot);
      setSpeakingRecentAttempt(attempt);
      clearSpeakingActiveExam(finalizedSnapshot.testId);
      this.onFinalized?.(attempt);
    } catch (error) {
      console.error('Speaking finalization failed:', error);
      const fallbackAttempt: SpeakingAttempt = {
        id: finalizedSnapshot.attemptId,
        examId: this.examId,
        sessionId: finalizedSnapshot.id,
        testId: finalizedSnapshot.testId,
        title: finalizedSnapshot.title,
        startedAt: finalizedSnapshot.startedAt,
        completedAt: finalizedSnapshot.completedAt,
        durationSeconds: finalizedSnapshot.elapsedSeconds,
        overallBand: finalizedSnapshot.result?.overallBand,
        criteria: finalizedSnapshot.result?.criteria || [],
        status: finalizedSnapshot.integrityEvents.length > 0 ? 'suspicious' : 'completed',
        integrityEvents: finalizedSnapshot.integrityEvents,
        result: finalizedSnapshot.result,
        transcriptSegments: finalizedSnapshot.transcriptSegments,
        questionIds: finalizedSnapshot.askedQuestionIds,
      };
      setSpeakingRecentAttempt(fallbackAttempt);
      clearSpeakingActiveExam(finalizedSnapshot.testId);
      this.onFinalized?.(fallbackAttempt);
    } finally {
      this.finalizing = false;
    }
  }

  destroy() {
    this.suspend();
    this.destroyed = true;
    this.outputController.destroy();
  }

  suspend() {
    this.connectAttempt += 1;
    this.hasConnected = false;
    this.isConnecting = false;
    this.cutInUserTurn = false;
    this.clearTimers();
    this.transcriptStream.cancel();
    this.inputController.setExaminerPlaybackActive(false);
    this.outputController.interrupt();
    this.inputController.stopMicrophone();
    this.transport?.disconnect();
  }

  private getSilenceThresholdMs() {
    const {partId} = this.store.getState().currentQuestion;

    if (partId === 'part2') {
      return PART2_SILENCE_THRESHOLD_MS;
    }

    if (partId === 'part3') {
      return PART3_SILENCE_THRESHOLD_MS;
    }

    return PART1_SILENCE_THRESHOLD_MS;
  }

  private setSilenceThresholdMs(silenceThresholdMs: number) {
    this.inputController.setSilenceThresholdMs(silenceThresholdMs);
    if (this.store.getState().microphone.silenceThresholdMs === silenceThresholdMs) {
      return;
    }

    this.store.setState((state) => ({
      ...state,
      microphone: {
        ...state.microphone,
        silenceThresholdMs,
      },
    }));
  }

  private syncSilenceThreshold() {
    this.setSilenceThresholdMs(this.getSilenceThresholdMs());
  }

  private startElapsedTimer() {
    if (this.elapsedTimerId) {
      window.clearInterval(this.elapsedTimerId);
    }

    this.elapsedTimerId = window.setInterval(() => {
      const startedAt = new Date(this.store.getState().startedAt).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      this.commit((state) => ({
        ...state,
        elapsedSeconds,
      }));
    }, 1000);
  }

  private startPreparationCountdown(seconds: number) {
    if (this.preparationTimerId) {
      window.clearInterval(this.preparationTimerId);
    }

    this.clearWaitingForUserWatch();
    this.clearUserTurnBudget();
    this.setSilenceThresholdMs(DEFAULT_SILENCE_THRESHOLD_MS);

    this.commit((state) => ({
      ...state,
      status: 'preparation_mode',
      currentSpeaker: 'none',
      prepRemainingSeconds: seconds,
      diagnostics: {
        ...state.diagnostics,
        lastEvent: 'Part 2 preparation time is in progress.',
      },
    }));

    this.preparationTimerId = window.setInterval(() => {
      const snapshot = this.store.getState();
      if (snapshot.prepRemainingSeconds <= 1) {
        window.clearInterval(this.preparationTimerId);
        this.preparationTimerId = undefined;
        this.commit((state) => ({
          ...state,
          prepRemainingSeconds: 0,
          status: 'moving_on',
        }));
        this.deliverInstruction(this.turnManager.completePreparation(this.store.getState()));
        return;
      }

      this.commit((state) => ({
        ...state,
        prepRemainingSeconds: state.prepRemainingSeconds - 1,
      }));
    }, 1000);
  }

  private enterWaitingForUser(message: string) {
    this.syncSilenceThreshold();
    const snapshot = this.store.getState();
    const nextStatus = snapshot.currentQuestion.partId === 'part3' ? 'discussion_mode' : 'waiting_for_user';

    this.commit((state) => ({
      ...state,
      status: nextStatus,
      currentSpeaker: 'none',
      liveExaminerTranscript: '',
      diagnostics: {
        ...state.diagnostics,
        lastEvent: message,
      },
    }));

    this.scheduleWaitingForUserWatch();
  }

  private scheduleWaitingForUserWatch() {
    this.clearWaitingForUserWatch();

    const snapshot = this.store.getState();
    if (snapshot.currentSpeaker !== 'none' || this.activeUserTurnId) {
      return;
    }

    const questionId = snapshot.currentQuestion.id;
    const delay = this.turnManager.getNoAnswerDelayMs(snapshot, this.questionSilencePromptsUsed);

    this.waitingForUserTimerId = window.setTimeout(() => {
      const current = this.store.getState();
      if (
        this.destroyed ||
        current.currentQuestion.id !== questionId ||
        current.currentSpeaker !== 'none' ||
        Boolean(this.activeUserTurnId) ||
        current.status === 'examiner_speaking' ||
        current.status === 'preparation_mode' ||
        current.status === 'preparing_part2'
      ) {
        return;
      }

      const instruction = this.turnManager.handleNoUserResponse(current, this.questionSilencePromptsUsed);
      this.deliverInstruction(instruction);
    }, delay);
  }

  private clearWaitingForUserWatch() {
    if (this.waitingForUserTimerId) {
      window.clearTimeout(this.waitingForUserTimerId);
      this.waitingForUserTimerId = undefined;
    }
  }

  private scheduleUserTurnBudget() {
    this.clearUserTurnBudget();

    const snapshot = this.store.getState();
    const questionId = snapshot.currentQuestion.id;
    const delay = this.turnManager.getUserTurnBudgetMs(snapshot);

    this.userTurnBudgetTimerId = window.setTimeout(() => {
      const current = this.store.getState();
      if (
        this.destroyed ||
        current.currentQuestion.id !== questionId ||
        current.currentSpeaker !== 'user' ||
        !this.activeUserTurnId
      ) {
        return;
      }

      this.cutInUserTurn = true;
      this.inputController.forceCompleteSpeechTurn();
    }, delay);
  }

  private clearUserTurnBudget() {
    if (this.userTurnBudgetTimerId) {
      window.clearTimeout(this.userTurnBudgetTimerId);
      this.userTurnBudgetTimerId = undefined;
    }
  }

  private clearTimers() {
    if (this.elapsedTimerId) {
      window.clearInterval(this.elapsedTimerId);
      this.elapsedTimerId = undefined;
    }

    if (this.preparationTimerId) {
      window.clearInterval(this.preparationTimerId);
      this.preparationTimerId = undefined;
    }

    if (this.persistTimerId) {
      window.clearTimeout(this.persistTimerId);
      this.persistTimerId = undefined;
    }

    this.clearWaitingForUserWatch();
    this.clearUserTurnBudget();
  }

  private handleUserSpeechEnd(text: string) {
    const state = this.store.getState();
    if (!this.activeUserTurnId) {
      return;
    }

    this.clearUserTurnBudget();
    this.clearWaitingForUserWatch();

    const segmentId = createId('segment-user');
    const now = new Date().toISOString();
    const question = state.currentQuestion;
    const activeTurn = state.turns.find((turn) => turn.id === this.activeUserTurnId);
    const durationMs = activeTurn?.startedAt
      ? Math.max(0, Date.now() - new Date(activeTurn.startedAt).getTime())
      : 0;
    const metrics: SpeakingTurnCompletionMetrics = {
      transcript: text,
      wordCount: countWords(text),
      durationMs,
      wasSilent: text === 'Response captured in live session.',
      wasCutOff: this.cutInUserTurn,
      followUpsUsed: this.questionFollowUpsUsed,
      silencePromptsUsed: this.questionSilencePromptsUsed,
    };
    const evaluation = evaluateSpeakingAnswer({
      transcript: text,
      question,
      examinerPrompt: this.lastExaminerPrompt,
      durationMs,
      timeSinceExaminerEndedMs:
        this.lastExaminerSpeechEndedAtMs === null
          ? null
          : Math.max(0, performance.now() - this.lastExaminerSpeechEndedAtMs),
      userTurnBudgetMs: this.turnManager.getUserTurnBudgetMs(state),
      wasCutOff: this.cutInUserTurn,
      followUpsUsed: this.questionFollowUpsUsed,
    });

    if (evaluation.isEchoLeak) {
      const turnId = this.activeUserTurnId;
      this.activeUserTurnId = undefined;
      this.cutInUserTurn = false;

      this.commit((current) => ({
        ...current,
        status: current.currentQuestion.partId === 'part3' ? 'discussion_mode' : 'waiting_for_user',
        currentSpeaker: 'none',
        liveUserTranscript: '',
        turns: current.turns.filter((turn) => turn.id !== turnId),
        diagnostics: {
          ...current.diagnostics,
          lastEvent: 'Examiner audio bleed was filtered. Waiting for a real candidate response.',
        },
        warnings: current.warnings.includes('Examiner speech leakage was blocked from the candidate transcript.')
          ? current.warnings
          : [...current.warnings, 'Examiner speech leakage was blocked from the candidate transcript.'],
      }));

      this.scheduleWaitingForUserWatch();
      return;
    }

    this.commit((current) => ({
      ...current,
      status: 'silence_watch',
      currentSpeaker: 'none',
      liveUserTranscript: '',
      transcriptSegments: [
        ...current.transcriptSegments,
        {
          id: segmentId,
          speaker: 'user',
          text: evaluation.cleanedTranscript || text,
          isFinal: true,
          startedAt: now,
          endedAt: now,
          partId: question.partId,
          questionId: question.id,
          source: 'speech-recognition',
        },
      ],
      turns: current.turns.map((turn) =>
        turn.id === this.activeUserTurnId
          ? {
              ...turn,
              endedAt: now,
              interrupted: this.cutInUserTurn,
              status: this.cutInUserTurn ? 'interrupted' : 'completed',
              transcriptSegmentIds: [...turn.transcriptSegmentIds, segmentId],
            }
          : turn
      ),
      diagnostics: {
        ...current.diagnostics,
        lastEvent: 'Candidate turn completed. Examiner is preparing the next response.',
      },
    }));

    this.activeUserTurnId = undefined;
    this.cutInUserTurn = false;

    const snapshotAtTurnEnd = this.store.getState();

    window.setTimeout(() => {
      this.resolveAndDeliverInstruction(snapshotAtTurnEnd.currentQuestion.id, metrics, evaluation).catch(
        (error) => {
          console.error('Failed to resolve examiner instruction:', error);
        }
      );
    }, this.turnManager.getExaminerResponseDelayMs(state, metrics));
  }

  private async resolveAndDeliverInstruction(
    expectedQuestionId: string,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ) {
    const snapshot = this.store.getState();
    if (this.destroyed || snapshot.currentQuestion.id !== expectedQuestionId || snapshot.currentSpeaker !== 'none') {
      return;
    }

    const instruction = await this.resolveExaminerInstruction(snapshot, metrics, evaluation);
    const current = this.store.getState();
    if (this.destroyed || current.currentQuestion.id !== expectedQuestionId || current.currentSpeaker !== 'none') {
      return;
    }

    this.deliverInstruction(instruction);
  }

  private async resolveExaminerInstruction(
    snapshot: SpeakingSessionSnapshot,
    metrics: SpeakingTurnCompletionMetrics,
    evaluation: SpeakingAnswerEvaluation
  ) {
    const backendDecision = await requestExaminerDecision(this.examId, snapshot, evaluation, metrics);
    if (backendDecision) {
      const instruction = this.buildInstructionFromBackendDecision(backendDecision);
      if (instruction) {
        return instruction;
      }
    }

    return this.turnManager.handleUserTurnCompleted(snapshot, metrics, evaluation);
  }

  private buildInstructionFromBackendDecision(
    decision: SpeakingExaminerDecisionResponse
  ): SpeakingTurnInstruction | null {
    const question = this.turnManager.getQuestionById(decision.questionId);
    if (!question) {
      return null;
    }

    return {
      kind: decision.kind,
      text: decision.text,
      question,
    };
  }

  private deliverInstruction(instruction: SpeakingTurnInstruction) {
    if (instruction.kind === 'finish') {
      this.commit((state) => ({
        ...state,
        status: 'closing',
        diagnostics: {
          ...state.diagnostics,
          lastEvent: 'Examiner is closing the speaking test.',
        },
      }));
      this.startExaminerSpeech(instruction.question, instruction.text, async () => {
        await this.endExam('manual');
      });
      return;
    }

    this.clearWaitingForUserWatch();
    this.clearUserTurnBudget();

    const currentQuestionId = this.store.getState().currentQuestion.id;
    const isSameQuestion = currentQuestionId === instruction.question.id;

    if (!isSameQuestion) {
      this.questionFollowUpsUsed = 0;
      this.questionSilencePromptsUsed = 0;
    } else if (
      instruction.kind === 'follow_up' ||
      instruction.kind === 'rescue_prompt' ||
      instruction.kind === 'gentle_redirect'
    ) {
      this.questionFollowUpsUsed += 1;
    } else if (instruction.kind === 'reprompt') {
      this.questionSilencePromptsUsed += 1;
    }

    const nextIndex = this.turnManager.getQuestionIndex(instruction.question.id);
    const nextRemainingQuestions = this.turnManager.getRemainingQuestions(nextIndex);

    this.commit((state) => ({
      ...state,
      currentQuestionIndex: nextIndex,
      currentQuestion: instruction.question,
      currentPartId: instruction.question.partId,
      remainingQuestions: nextRemainingQuestions,
      askedQuestionIds: state.askedQuestionIds.includes(instruction.question.id)
        ? state.askedQuestionIds
        : [...state.askedQuestionIds, instruction.question.id],
    }));

    this.startExaminerSpeech(instruction.question, instruction.text, () => {
      if (instruction.kind === 'prepare_part2') {
        this.startPreparationCountdown(instruction.question.cueCard?.preparationSeconds ?? 60);
        return;
      }

      this.enterWaitingForUser('Waiting for candidate response.');
    });
  }

  private startExaminerSpeech(
    question: SpeakingQuestion,
    text: string,
    onComplete: () => void | Promise<void>
  ) {
    const turnId = createId('turn-examiner');
    this.activeExaminerTurnId = turnId;
    this.lastExaminerPrompt = text;
    this.lastExaminerSpeechEndedAtMs = null;

    this.commit((state) => ({
      ...state,
      status: 'examiner_speaking',
      currentSpeaker: 'examiner',
      liveExaminerTranscript: '',
      speakerOutput: {
        ...state.speakerOutput,
        isSpeaking: true,
      },
      turns: [
        ...state.turns,
        {
          id: turnId,
          speaker: 'examiner',
          partId: question.partId,
          questionId: question.id,
          startedAt: new Date().toISOString(),
          interrupted: false,
          transcriptSegmentIds: [],
          status: 'active',
        },
      ],
      diagnostics: {
        ...state.diagnostics,
        lastEvent: `Examiner turn started: ${SESSION_STATUS_LABELS.examiner_speaking}.`,
      },
    }));

    this.transcriptStream.start(text, {
      onUpdate: (partialText) => {
        this.store.setState((state) => ({
          ...state,
          liveExaminerTranscript: partialText,
        }));
      },
    });

    this.outputController.speak(text, {
      onStart: () => {
        this.inputController.setExaminerPlaybackActive(true);
        this.setSilenceThresholdMs(DEFAULT_SILENCE_THRESHOLD_MS);
        this.store.setState((state) => ({
          ...state,
          speakerOutput: {
            ...state.speakerOutput,
            isSpeaking: true,
          },
        }));
      },
      onEnd: async () => {
        this.inputController.setExaminerPlaybackActive(false);
        this.lastExaminerSpeechEndedAtMs = performance.now();
        this.syncSilenceThreshold();
        this.transcriptStream.cancel();
        const segmentId = createId('segment-examiner');
        const now = new Date().toISOString();

        this.commit((state) => ({
          ...state,
          liveExaminerTranscript: '',
          speakerOutput: {
            ...state.speakerOutput,
            isSpeaking: false,
          },
          transcriptSegments: [
            ...state.transcriptSegments,
            {
              id: segmentId,
              speaker: 'examiner',
              text,
              isFinal: true,
              startedAt: now,
              endedAt: now,
              partId: question.partId,
              questionId: question.id,
              source: 'speech-synthesis',
            },
          ],
          turns: state.turns.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  endedAt: now,
                  status: 'completed',
                  transcriptSegmentIds: [...turn.transcriptSegmentIds, segmentId],
                }
              : turn
          ),
        }));

        this.activeExaminerTurnId = undefined;
        await onComplete();
      },
    }).catch((error) => {
      console.error('Examiner speech playback failed:', error);
    });
  }

  private schedulePersist(snapshot: SpeakingSessionSnapshot) {
    if (this.persistTimerId) {
      window.clearTimeout(this.persistTimerId);
      this.persistTimerId = undefined;
    }

    this.persistTimerId = window.setTimeout(() => {
      mirrorPersistedSession(this.examId, snapshot).catch((error) => {
        console.error('Speaking session persist failed:', error);
      });
    }, 240);
  }

  private commit(updater: (state: SpeakingSessionSnapshot) => SpeakingSessionSnapshot) {
    this.store.setState((state) => {
      const next = updater(state);
      const snapshot = {
        ...next,
        updatedAt: new Date().toISOString(),
      };

      if (!this.finalizing) {
        this.schedulePersist(snapshot);
        this.transport?.updateSession(buildPersistableSession(snapshot));
      }

      return snapshot;
    });
  }
}
