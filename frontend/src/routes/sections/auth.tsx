import { lazy } from 'react';
// auth
import { GuestGuard } from 'src/auth/guard';
// layouts
import AuthClassicLayout from 'src/layouts/auth/classic';

// ----------------------------------------------------------------------

const JwtLoginPage = lazy(() => import('src/pages/auth/jwt/login'));
const JwtRegisterPage = lazy(() => import('src/pages/auth/jwt/register'));
const JwtConfirmPage = lazy(() => import('src/pages/auth/jwt/confirm'));
const AUTH_HERO_IMAGE = '/assets/band-nine-hero.png';

// ----------------------------------------------------------------------

export const authRoutes = [
  {
    path: 'login',
    element: (
      <GuestGuard>
        <AuthClassicLayout
          image={AUTH_HERO_IMAGE}
          whiteBackground
          centerContent
          hideBreadcrumbs
        >
          <JwtLoginPage />
        </AuthClassicLayout>
      </GuestGuard>
    ),
  },
  {
    path: 'register',
    element: (
      <GuestGuard>
        <AuthClassicLayout
          image={AUTH_HERO_IMAGE}
          whiteBackground
          centerContent
          hideBreadcrumbs
        >
          <JwtRegisterPage />
        </AuthClassicLayout>
      </GuestGuard>
    ),
  },
  {
    path: 'confirm/:token',
    element: (
      <AuthClassicLayout>
        <JwtConfirmPage />
      </AuthClassicLayout>
    ),
  },
];
