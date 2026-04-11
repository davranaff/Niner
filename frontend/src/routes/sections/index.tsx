import { Navigate, useRoutes } from 'react-router-dom';
// routes
import { paths } from 'src/routes/paths';
//
import { mainRoutes } from './main';
import { authRoutes } from './auth';
import { appsRoutes } from './apps';
import { componentsRoutes } from './components';

// App route table (root → JWT login).

// ----------------------------------------------------------------------

export default function Router() {
  return useRoutes([
    {
      path: '/',
      element: <Navigate to={paths.login} replace />,
    },

    ...authRoutes,
    ...appsRoutes,

    // Main routes
    ...mainRoutes,

    // Components routes
    ...componentsRoutes,

    // No match 404
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
