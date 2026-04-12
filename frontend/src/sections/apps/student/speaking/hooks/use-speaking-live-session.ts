import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { SpeakingRealtimeSessionClient } from '../services/speaking-realtime-session-client';
import type { SpeakingAttempt, SpeakingSessionSnapshot } from '../types';

type Params = {
  examId: number;
  snapshot: SpeakingSessionSnapshot;
  onFinalized?: (attempt: SpeakingAttempt) => void;
};

export function useSpeakingLiveSession({ examId, snapshot, onFinalized }: Params) {
  const client = useMemo(
    () =>
      new SpeakingRealtimeSessionClient({
        examId,
        snapshot,
        onFinalized,
      }),
    [examId, onFinalized, snapshot]
  );

  const liveSnapshot = useSyncExternalStore(
    client.store.subscribe,
    client.store.getState,
    client.store.getState
  );

  useEffect(() => {
    client.connect().catch((error) => {
      console.error('Speaking live session connection failed:', error);
    });

    return () => {
      client.suspend();
    };
  }, [client]);

  return {
    snapshot: liveSnapshot,
    client,
  };
}
