import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type UseSessionCountdownParams = {
  attemptId: string;
  attemptStatus?: string;
  blocked: boolean;
  remainingTimeSec: number | null;
  onTick: Dispatch<SetStateAction<number | null>>;
};

export function useSessionCountdown({
  attemptId,
  attemptStatus,
  blocked,
  remainingTimeSec,
  onTick,
}: UseSessionCountdownParams) {
  useEffect(() => {
    if (!attemptId || attemptStatus !== 'in_progress' || blocked || remainingTimeSec == null) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      onTick((previous) => (previous == null ? 0 : Math.max(0, previous - 1)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [attemptId, attemptStatus, blocked, onTick, remainingTimeSec]);
}
