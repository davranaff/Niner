import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AuthGuard } from 'src/auth/guard';
import { LoadingScreen } from 'src/components/loading-screen';
import DashboardLayout from 'src/layouts/dashboard';

import { adminAppDashboardRoutes } from './admin';
import { studentAppDashboardRoutes, studentAppSessionRoutes } from './student';
import { teacherAppDashboardRoutes } from './teacher';

export const appsRoutes = [
  {
    element: (
      <AuthGuard>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AuthGuard>
    ),
    children: studentAppSessionRoutes,
  },
  {
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Outlet />,
        children: [...studentAppDashboardRoutes, ...teacherAppDashboardRoutes, ...adminAppDashboardRoutes],
      },
    ],
  },
];
