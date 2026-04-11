import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

type UseSessionTimeoutEffectParams = {
  attemptId: string;
  attemptStatus?: string;
  remainingTimeSec: number | null;
  finalizingRef: MutableRefObject<boolean>;
  onTimeout: () => Promise<void>;
};

export function useSessionTimeoutEffect({
  attemptId,
  attemptStatus,
  remainingTimeSec,
  finalizingRef,
  onTimeout,
}: UseSessionTimeoutEffectParams) {
  useEffect(() => {
    if (
      !attemptId ||
      attemptStatus !== 'in_progress' ||
      finalizingRef.current ||
      remainingTimeSec == null
    ) {
      return;
    }

    if (remainingTimeSec !== 0) {
      return;
    }

    finalizingRef.current = true;

    onTimeout().catch(() => {
      finalizingRef.current = false;
    });
  }, [attemptId, attemptStatus, finalizingRef, onTimeout, remainingTimeSec]);
}
