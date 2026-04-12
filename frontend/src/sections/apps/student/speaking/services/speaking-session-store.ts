import {
  DEFAULT_NOISE_THRESHOLD,
  DEFAULT_SILENCE_THRESHOLD_MS,
} from '../constants';
import type {
  SpeakingSession,
  SpeakingSessionSnapshot,
  SpeakingSpeakerOutputState,
  SpeakingTestDetail,
} from '../types';

type Listener = () => void;

function buildSpeakerOutputState(): SpeakingSpeakerOutputState {
  return {
    isEnabled: true,
    isSpeaking: false,
  };
}

export function createSpeakingSessionSnapshot(
  session: SpeakingSession,
  test: SpeakingTestDetail
): SpeakingSessionSnapshot {
  const questions = test.parts.flatMap((part) => part.questions);
  const currentQuestion = questions[session.currentQuestionIndex] ?? questions[0];

  return {
    ...session,
    test,
    currentQuestion,
    remainingQuestions: questions.slice(session.currentQuestionIndex + 1),
    liveExaminerTranscript: '',
    liveUserTranscript: '',
    microphone: {
      permission: 'prompt',
      isActive: false,
      isMuted: false,
      level: 0,
      noiseThreshold: DEFAULT_NOISE_THRESHOLD,
      silenceThresholdMs: DEFAULT_SILENCE_THRESHOLD_MS,
    },
    speakerOutput: buildSpeakerOutputState(),
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

export class SpeakingSessionStore {
  private listeners = new Set<Listener>();

  constructor(private state: SpeakingSessionSnapshot) {}

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  setState(updater: (state: SpeakingSessionSnapshot) => SpeakingSessionSnapshot) {
    this.state = updater(this.state);
    this.listeners.forEach((listener) => listener());
  }

  patch(partial: Partial<SpeakingSessionSnapshot>) {
    this.state = {
      ...this.state,
      ...partial,
    };
    this.listeners.forEach((listener) => listener());
  }
}
