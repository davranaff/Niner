import { lazy, type ReactElement } from 'react';
import type { RouteObject } from 'react-router-dom';

import { RoleBasedGuard } from 'src/auth/guard';

const AppsTeacherDashboardPage = lazy(() => import('src/pages/apps/teacher/dashboard'));
const AppsTeacherStudentsPage = lazy(() => import('src/pages/apps/teacher/students'));
const AppsTeacherStudentDetailsPage = lazy(() => import('src/pages/apps/teacher/student-details'));
const AppsTeacherAttemptDetailsPage = lazy(() => import('src/pages/apps/teacher/attempt-details'));
const AppsTeacherAnalyticsPage = lazy(() => import('src/pages/apps/teacher/analytics'));

function teacherOnly(element: ReactElement) {
  return <RoleBasedGuard roles={['teacher']}>{element}</RoleBasedGuard>;
}

export const teacherAppDashboardRoutes: RouteObject[] = [
  {
    path: 'teacher',
    element: teacherOnly(<AppsTeacherDashboardPage />),
  },
  {
    path: 'teacher/students',
    element: teacherOnly(<AppsTeacherStudentsPage />),
  },
  {
    path: 'teacher/students/:studentId',
    element: teacherOnly(<AppsTeacherStudentDetailsPage />),
  },
  {
    path: 'teacher/attempts/:attemptId',
    element: teacherOnly(<AppsTeacherAttemptDetailsPage />),
  },
  {
    path: 'teacher/analytics',
    element: teacherOnly(<AppsTeacherAnalyticsPage />),
  },
];
