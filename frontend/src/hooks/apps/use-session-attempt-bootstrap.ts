import { useEffect, useRef } from 'react';

import type { MockAttempt } from 'src/_mock/ielts';

import type { TestDetailsData } from 'src/sections/apps/common/api/types';
import { canResumeAttempt } from 'src/sections/apps/common/module-test/utils/session';

type UseSessionAttemptBootstrapParams = {
  detailData?: TestDetailsData;
  resolvedAttemptId: string;
  testId: string;
  onResolve: (attemptId: string) => void;
  startAttempt: (testId: string) => Promise<Pick<MockAttempt, 'id'>>;
};

export function useSessionAttemptBootstrap({
  detailData,
  resolvedAttemptId,
  testId,
  onResolve,
  startAttempt,
}: UseSessionAttemptBootstrapParams) {
  const bootstrapRef = useRef(false);

  useEffect(() => {
    if (!detailData || bootstrapRef.current || resolvedAttemptId) {
      return;
    }

    const { lastAttempt } = detailData;

    if (lastAttempt && canResumeAttempt(lastAttempt)) {
      onResolve(lastAttempt.id);
      return;
    }

    bootstrapRef.current = true;

    startAttempt(testId)
      .then((attempt) => {
        onResolve(attempt.id);
      })
      .catch(() => {
        bootstrapRef.current = false;
      });
  }, [detailData, onResolve, resolvedAttemptId, startAttempt, testId]);
}
