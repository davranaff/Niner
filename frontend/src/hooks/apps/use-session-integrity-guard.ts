import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import type { MockIntegrityEvent } from 'src/_mock/ielts';

import { terminateAttemptSync } from 'src/sections/apps/common/api/apps-service';
import { appsQueryKeys } from 'src/sections/apps/common/api/use-apps';

type UseSessionIntegrityGuardParams = {
  attemptId: string;
  attemptStatus?: string;
  allowExitRef: MutableRefObject<boolean>;
  integrityTriggeredRef: MutableRefObject<boolean>;
  remainingTimeRef: MutableRefObject<number>;
  onBlocked: () => void;
};

export function useSessionIntegrityGuard({
  attemptId,
  attemptStatus,
  allowExitRef,
  integrityTriggeredRef,
  remainingTimeRef,
  onBlocked,
}: UseSessionIntegrityGuardParams) {
  const queryClient = useQueryClient();

  const handlePersistViolation = useCallback(
    (eventType: MockIntegrityEvent['type'], openDialog: boolean) => {
      if (!attemptId || attemptStatus !== 'in_progress') return;
      if (allowExitRef.current || integrityTriggeredRef.current) return;

      integrityTriggeredRef.current = true;

      terminateAttemptSync({
        attemptId,
        reason: 'tab_switch',
        eventType,
        remainingTimeSec: remainingTimeRef.current,
      });

      queryClient.invalidateQueries({ queryKey: appsQueryKeys.root });

      if (openDialog) {
        onBlocked();
      }
    },
    [
      allowExitRef,
      attemptId,
      attemptStatus,
      integrityTriggeredRef,
      onBlocked,
      queryClient,
      remainingTimeRef,
    ]
  );

  useEffect(() => {
    if (!attemptId || attemptStatus !== 'in_progress') {
      return undefined;
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const { target } = event;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameRoute =
        nextUrl.origin === currentUrl.origin &&
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash;

      if (!isSameRoute) {
        handlePersistViolation('route_leave', false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePersistViolation('visibility_hidden', true);
      }
    };

    const onBlur = () => {
      handlePersistViolation('window_blur', true);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      handlePersistViolation('before_unload', false);
      event.preventDefault();
      event.returnValue = '';
    };

    const onPopState = () => {
      handlePersistViolation('route_leave', false);
    };

    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('click', onDocumentClick, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [attemptId, attemptStatus, handlePersistViolation]);
}
