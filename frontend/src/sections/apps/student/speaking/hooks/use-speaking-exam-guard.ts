import { useEffect, useRef } from 'react';

import type { SpeakingIntegrityEventType } from '../types';

export function useSpeakingExamGuard(
  active: boolean,
  onIntegrityEvent: (type: SpeakingIntegrityEventType) => void
) {
  const lastEventAtRef = useRef(0);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const pushIntegrityEvent = (type: SpeakingIntegrityEventType) => {
      const now = Date.now();
      if (now - lastEventAtRef.current < 1200) {
        return;
      }

      lastEventAtRef.current = now;
      onIntegrityEvent(type);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      pushIntegrityEvent('refresh_attempt');
      event.preventDefault();
      event.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pushIntegrityEvent('tab_switch');
      }
    };

    const handleBlur = () => {
      pushIntegrityEvent('window_blur');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [active, onIntegrityEvent]);
}
