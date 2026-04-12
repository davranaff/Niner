import { lazy, type ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RoleBasedGuard } from 'src/auth/guard';

const AppsAdminDashboardPage = lazy(() => import('src/pages/apps/admin/dashboard'));
const AppsAdminReadingPage = lazy(() => import('src/pages/apps/admin/reading'));
const AppsAdminReadingDetailsPage = lazy(() => import('src/pages/apps/admin/reading-test'));
const AppsAdminListeningPage = lazy(() => import('src/pages/apps/admin/listening'));
const AppsAdminListeningDetailsPage = lazy(() => import('src/pages/apps/admin/listening-test'));
const AppsAdminWritingPage = lazy(() => import('src/pages/apps/admin/writing'));
const AppsAdminWritingDetailsPage = lazy(() => import('src/pages/apps/admin/writing-test'));
const AppsAdminLessonsPage = lazy(() => import('src/pages/apps/admin/lessons'));
const AppsAdminExamsPage = lazy(() => import('src/pages/apps/admin/exams'));

function adminOnly(element: ReactElement) {
  return <RoleBasedGuard roles={['admin']}>{element}</RoleBasedGuard>;
}

export const adminAppDashboardRoutes: RouteObject[] = [
  {
    path: 'admin',
    element: adminOnly(<AppsAdminDashboardPage />),
  },
  {
    path: 'admin/reading',
    element: adminOnly(<AppsAdminReadingPage />),
  },
  {
    path: 'admin/reading/tests/:testId',
    element: adminOnly(<AppsAdminReadingDetailsPage />),
  },
  {
    path: 'admin/listening',
    element: adminOnly(<AppsAdminListeningPage />),
  },
  {
    path: 'admin/listening/tests/:testId',
    element: adminOnly(<AppsAdminListeningDetailsPage />),
  },
  {
    path: 'admin/writing',
    element: adminOnly(<AppsAdminWritingPage />),
  },
  {
    path: 'admin/writing/tests/:testId',
    element: adminOnly(<AppsAdminWritingDetailsPage />),
  },
  {
    path: 'admin/lessons',
    element: adminOnly(<AppsAdminLessonsPage />),
  },
  {
    path: 'admin/exams',
    element: adminOnly(<AppsAdminExamsPage />),
  },
];
