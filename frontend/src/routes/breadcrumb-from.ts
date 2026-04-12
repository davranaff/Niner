import { matchPath } from 'react-router-dom';

/** Query key: when opening attempt/session from My tests, breadcrumbs use My tests as parent. */
export const BREADCRUMB_FROM_QUERY_KEY = 'bc_from' as const;

export const BREADCRUMB_FROM_MY_TESTS = 'my-tests' as const;

export type BreadcrumbFromMyTests = typeof BREADCRUMB_FROM_MY_TESTS;

export function isBreadcrumbFromMyTests(searchParams: URLSearchParams): boolean {
  return searchParams.get(BREADCRUMB_FROM_QUERY_KEY) === BREADCRUMB_FROM_MY_TESTS;
}

export function appendBreadcrumbFromMyTests(path: string): string {
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}${BREADCRUMB_FROM_QUERY_KEY}=${BREADCRUMB_FROM_MY_TESTS}`;
}

const STUDENT_MODULE_ATTEMPT_OR_SESSION_PATTERNS = [
  '/dashboard/reading/attempts/:attemptId',
  '/dashboard/listening/attempts/:attemptId',
  '/dashboard/writing/attempts/:attemptId',
  '/dashboard/speaking/attempts/:attemptId',
  '/dashboard/reading/tests/:testId/session',
  '/dashboard/listening/tests/:testId/session',
  '/dashboard/writing/tests/:testId/session',
  '/dashboard/speaking/tests/:testId/session',
] as const;

/** Result or in-progress session under Reading / Listening / Writing (not the test intro page). */
export function isStudentModuleAttemptOrSessionPath(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname;
  return STUDENT_MODULE_ATTEMPT_OR_SESSION_PATTERNS.some(
    (pattern) => !!matchPath({ path: pattern, end: true }, normalized)
  );
}
