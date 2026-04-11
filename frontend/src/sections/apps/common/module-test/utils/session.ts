import type { MockAttempt } from 'src/_mock/ielts';

export function canResumeAttempt(lastAttempt?: MockAttempt | null) {
  if (!lastAttempt) {
    return false;
  }

  return (
    lastAttempt.status === 'in_progress' ||
    (lastAttempt.status === 'terminated' && lastAttempt.finishReason === 'tab_switch')
  );
}
