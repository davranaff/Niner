import { lazy, type ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RoleBasedGuard } from 'src/auth/guard';
import SessionLayout from 'src/layouts/dashboard/session-layout';

const AppsDashboardPage = lazy(() => import('src/pages/apps/student/dashboard'));
const AppsReadingPage = lazy(() => import('src/pages/apps/student/reading'));
const AppsReadingTestPage = lazy(() => import('src/pages/apps/student/reading-test'));
const AppsReadingSessionPage = lazy(() => import('src/pages/apps/student/reading-session'));
const AppsReadingResultPage = lazy(() => import('src/pages/apps/student/reading-result'));

const AppsListeningPage = lazy(() => import('src/pages/apps/student/listening'));
const AppsListeningTestPage = lazy(() => import('src/pages/apps/student/listening-test'));
const AppsListeningSessionPage = lazy(() => import('src/pages/apps/student/listening-session'));
const AppsListeningResultPage = lazy(() => import('src/pages/apps/student/listening-result'));

const AppsWritingPage = lazy(() => import('src/pages/apps/student/writing'));
const AppsWritingTestPage = lazy(() => import('src/pages/apps/student/writing-test'));
const AppsWritingSessionPage = lazy(() => import('src/pages/apps/student/writing-session'));
const AppsWritingResultPage = lazy(() => import('src/pages/apps/student/writing-result'));

const AppsSpeakingPage = lazy(() => import('src/pages/apps/student/speaking'));
const AppsSpeakingTestPage = lazy(() => import('src/pages/apps/student/speaking-test'));
const AppsSpeakingSessionPage = lazy(() => import('src/pages/apps/student/speaking-session'));
const AppsSpeakingResultPage = lazy(() => import('src/pages/apps/student/speaking-result'));

const AppsOverallExamPage = lazy(() => import('src/pages/apps/student/overall-exam'));
const AppsOverallExamSessionPage = lazy(
  () => import('src/pages/apps/student/overall-exam-session-page')
);
const AppsOverallExamResultPage = lazy(() => import('src/pages/apps/student/overall-exam-result'));

const AppsMyTestsPage = lazy(() => import('src/pages/apps/student/my-tests'));
const AppsProfilePage = lazy(() => import('src/pages/apps/student/profile'));

function studentOnly(element: ReactElement) {
  return <RoleBasedGuard roles={['student']}>{element}</RoleBasedGuard>;
}

function studentSessionPage(page: ReactElement) {
  return studentOnly(<SessionLayout>{page}</SessionLayout>);
}

export const studentAppSessionRoutes: RouteObject[] = [
  {
    path: 'dashboard/reading/tests/:testId/session',
    element: studentSessionPage(<AppsReadingSessionPage />),
  },
  {
    path: 'dashboard/listening/tests/:testId/session',
    element: studentSessionPage(<AppsListeningSessionPage />),
  },
  {
    path: 'dashboard/writing/tests/:testId/session',
    element: studentSessionPage(<AppsWritingSessionPage />),
  },
  {
    path: 'dashboard/speaking/tests/:testId/session',
    element: studentOnly(<AppsSpeakingSessionPage />),
  },
  {
    path: 'dashboard/overall-exam/session/:overallId',
    element: studentSessionPage(<AppsOverallExamSessionPage />),
  },
];

export const studentAppDashboardRoutes: RouteObject[] = [
  {
    index: true,
    element: studentOnly(<AppsDashboardPage />),
  },
  {
    path: 'reading',
    element: studentOnly(<AppsReadingPage />),
  },
  {
    path: 'reading/tests/:testId',
    element: studentOnly(<AppsReadingTestPage />),
  },
  {
    path: 'reading/attempts/:attemptId',
    element: studentOnly(<AppsReadingResultPage />),
  },
  {
    path: 'listening',
    element: studentOnly(<AppsListeningPage />),
  },
  {
    path: 'listening/tests/:testId',
    element: studentOnly(<AppsListeningTestPage />),
  },
  {
    path: 'listening/attempts/:attemptId',
    element: studentOnly(<AppsListeningResultPage />),
  },
  {
    path: 'writing',
    element: studentOnly(<AppsWritingPage />),
  },
  {
    path: 'writing/tests/:testId',
    element: studentOnly(<AppsWritingTestPage />),
  },
  {
    path: 'writing/attempts/:attemptId',
    element: studentOnly(<AppsWritingResultPage />),
  },
  {
    path: 'speaking',
    element: studentOnly(<AppsSpeakingPage />),
  },
  {
    path: 'speaking/tests/:testId',
    element: studentOnly(<AppsSpeakingTestPage />),
  },
  {
    path: 'speaking/attempts/:attemptId',
    element: studentOnly(<AppsSpeakingResultPage />),
  },
  {
    path: 'overall-exam',
    element: studentOnly(<AppsOverallExamPage />),
  },
  {
    path: 'overall-exam/attempts/:overallId',
    element: studentOnly(<AppsOverallExamResultPage />),
  },
  {
    path: 'my-tests',
    element: studentOnly(<AppsMyTestsPage />),
  },
  {
    path: 'profile',
    element: studentOnly(<AppsProfilePage />),
  },
];
