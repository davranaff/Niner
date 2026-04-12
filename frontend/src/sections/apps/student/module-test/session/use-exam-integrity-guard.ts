import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export type ExamIntegrityViolationSource =
  | 'visibility_hidden'
  | 'window_blur'
  | 'route_leave'
  | 'before_unload';

type UseExamIntegrityGuardParams = {
  enabled: boolean;
  allowExitRef: MutableRefObject<boolean>;
  onViolation: (source: ExamIntegrityViolationSource) => void;
  blockClipboard?: boolean;
};

export function useExamIntegrityGuard({
  enabled,
  allowExitRef,
  onViolation,
  blockClipboard = true,
}: UseExamIntegrityGuardParams) {
  const lastViolationTsRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const triggerViolation = (source: ExamIntegrityViolationSource) => {
      if (allowExitRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastViolationTsRef.current < 400) {
        return;
      }
      lastViolationTsRef.current = now;
      onViolation(source);
    };

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

      if (isSameRoute) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      triggerViolation('route_leave');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('visibility_hidden');
      }
    };

    const onBlur = () => {
      triggerViolation('window_blur');
    };

    const onPopState = () => {
      if (allowExitRef.current) {
        return;
      }

      window.history.pushState({ examGuard: true }, '', window.location.href);
      triggerViolation('route_leave');
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowExitRef.current) {
        return;
      }

      triggerViolation('before_unload');
      event.preventDefault();
      event.returnValue = '';
    };

    const blockedMetaKeys = new Set(['a', 'c', 'f', 'p', 's', 'u', 'v', 'x']);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && blockedMetaKeys.has(key)) {
        event.preventDefault();
        return;
      }

      if (event.key === 'F12' || event.key === 'PrintScreen') {
        event.preventDefault();
      }
    };

    const preventDefault = (event: Event) => {
      event.preventDefault();
    };

    window.history.pushState({ examGuard: true }, '', window.location.href);

    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKeyDown, true);

    if (blockClipboard) {
      document.addEventListener('contextmenu', preventDefault);
      document.addEventListener('copy', preventDefault);
      document.addEventListener('cut', preventDefault);
      document.addEventListener('paste', preventDefault);
    }

    return () => {
      document.removeEventListener('click', onDocumentClick, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeyDown, true);

      if (blockClipboard) {
        document.removeEventListener('contextmenu', preventDefault);
        document.removeEventListener('copy', preventDefault);
        document.removeEventListener('cut', preventDefault);
        document.removeEventListener('paste', preventDefault);
      }
    };
  }, [allowExitRef, blockClipboard, enabled, onViolation]);
}
