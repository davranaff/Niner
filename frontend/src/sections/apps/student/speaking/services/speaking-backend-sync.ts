import { HOST_API } from 'src/config-global';

import {
  fetchExaminerDecision,
  finalizeSpeakingExam,
  persistSpeakingSession,
} from '../api/speaking-requests';
import type {
  SpeakingExaminerDecisionRequest,
  SpeakingExaminerDecisionResponse,
} from '../api/types';
import type {
  SpeakingAnswerEvaluation,
  SpeakingAttempt,
  SpeakingSession,
  SpeakingSessionSnapshot,
} from '../types';
import type { SpeakingTurnCompletionMetrics } from './speaking-turn-manager';
import { buildPersistableSession, toSnakeCaseValue } from './speaking-storage';

interface SpeakingRealtimeTransportEvent {
  type: string;
  examId?: number;
  message?: string;
  payload?: Record<string, unknown>;
}

interface SpeakingRealtimeTransportCallbacks {
  onClose?: () => void;
  onError?: (message: string) => void;
  onEvent?: (event: SpeakingRealtimeTransportEvent) => void;
  onOpen?: () => void;
}

function getBaseUrl() {
  const raw = String(HOST_API ?? '').trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

function shouldUseBackendExaminerDecisions() {
  const raw = String(process.env.REACT_APP_SPEAKING_USE_BACKEND_DECISIONS ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function isSpeakingBackendEnabled() {
  return getBaseUrl().length > 0;
}

export function getSpeakingBackendBaseUrl() {
  return getBaseUrl();
}

export async function mirrorPersistedSession(examId: number, snapshot: SpeakingSessionSnapshot | SpeakingSession) {
  const session = 'test' in snapshot ? buildPersistableSession(snapshot) : snapshot;
  return persistSpeakingSession(examId, { session });
}

export async function mirrorFinalizedSession(examId: number, snapshot: SpeakingSessionSnapshot) {
  const session = buildPersistableSession(snapshot);
  return finalizeSpeakingExam(examId, { session });
}

export async function requestExaminerDecision(
  examId: number,
  snapshot: SpeakingSessionSnapshot,
  evaluation: SpeakingAnswerEvaluation,
  metrics: SpeakingTurnCompletionMetrics
): Promise<SpeakingExaminerDecisionResponse | null> {
  if (!shouldUseBackendExaminerDecisions()) {
    return null;
  }

  const payload: SpeakingExaminerDecisionRequest = {
    session: buildPersistableSession(snapshot),
    evaluation,
    metrics: {
      transcript: metrics.transcript,
      wordCount: metrics.wordCount,
      durationMs: metrics.durationMs,
      wasSilent: metrics.wasSilent,
      wasCutOff: metrics.wasCutOff,
      followUpsUsed: metrics.followUpsUsed,
      silencePromptsUsed: metrics.silencePromptsUsed,
    },
  };

  try {
    return await fetchExaminerDecision(examId, payload);
  } catch (error) {
    // Deterministic fallback in session client covers backend failures.
    console.error('Speaking examiner decision request failed:', error);
    return null;
  }
}

export function getSpeakingBackendWebSocketUrl(examId: number) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return '';
  }

  const wsBase = baseUrl.replace(/^http/i, 'ws');
  return `${wsBase}/api/v1/speaking/live/${examId}`;
}

export class SpeakingRealtimeTransportClient {
  private socket?: WebSocket;

  constructor(
    private examId: number,
    private callbacks: SpeakingRealtimeTransportCallbacks = {}
  ) {}

  connect(session: SpeakingSession) {
    const wsUrl = getSpeakingBackendWebSocketUrl(this.examId);
    if (!wsUrl || this.socket) {
      return;
    }

    this.socket = new WebSocket(wsUrl);
    this.socket.onopen = () => {
      this.send('session.connect', {
        status: session.status,
        connectionState: session.connectionState,
      });
      this.send('session.snapshot', { session });
      this.callbacks.onOpen?.();
    };
    this.socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as {
          type?: string;
          exam_id?: number;
          message?: string;
          payload?: Record<string, unknown>;
        };

        this.callbacks.onEvent?.({
          type: String(raw.type ?? ''),
          examId: raw.exam_id,
          message: raw.message,
          payload: raw.payload,
        });
      } catch {
        this.callbacks.onError?.('Speaking realtime socket returned an unreadable event.');
      }
    };
    this.socket.onerror = () => {
      this.callbacks.onError?.('Speaking realtime socket error.');
    };
    this.socket.onclose = () => {
      this.socket = undefined;
      this.callbacks.onClose?.();
    };
  }

  updateSession(session: SpeakingSession) {
    this.send('session.snapshot', { session });
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const body = {
      type,
      examId: this.examId,
      payload,
    };

    this.socket.send(JSON.stringify(toSnakeCaseValue(body)));
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      this.send('session.disconnect');
    }
    this.socket.close();
    this.socket = undefined;
  }
}

export type { SpeakingExaminerDecisionResponse, SpeakingAttempt };
