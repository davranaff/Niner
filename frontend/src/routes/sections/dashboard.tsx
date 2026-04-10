import { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';
// auth
import { AuthGuard } from 'src/auth/guard';
// layouts
import DashboardLayout from 'src/layouts/dashboard';
// components
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const IeltsDashboardPage = lazy(() => import('../../pages/ielts-dashboard'));
const IeltsReadingPage = lazy(() => import('../../pages/ielts-reading'));
const IeltsListeningPage = lazy(() => import('../../pages/ielts-listening'));
const IeltsWritingPage = lazy(() => import('../../pages/ielts-writing'));

// ----------------------------------------------------------------------

export const dashboardRoutes = [
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
        children: [
          { index: true, element: <IeltsDashboardPage /> },
          { path: 'reading', element: <IeltsReadingPage /> },
          { path: 'listening', element: <IeltsListeningPage /> },
          { path: 'writing', element: <IeltsWritingPage /> },
        ],
      },
    ],
  },
];
