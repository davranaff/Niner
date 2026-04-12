import type { SpeakingSession, SpeakingSessionSnapshot } from '../types';

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

function camelToSnakeKey(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

export function toSnakeCaseValue<T>(value: T): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseValue(item));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      output[camelToSnakeKey(key)] = toSnakeCaseValue(nested);
    });
    return output;
  }

  return value;
}
