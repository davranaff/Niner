import { useCallback, useEffect } from 'react';
// routes
import { useRouter } from 'src/routes/hook';
import { getDefaultDashboardPath } from 'src/sections/apps/common/api/apps-service';
//
import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

type GuestGuardProps = {
  children: React.ReactNode;
};

export default function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();

  const { authenticated, user } = useAuthContext();

  const check = useCallback(() => {
    if (authenticated) {
      const currentRole = typeof user === 'object' && user && 'role' in user ? String(user.role) : 'student';
      router.replace(getDefaultDashboardPath(currentRole === 'teacher' ? 'teacher' : 'student'));
    }
  }, [authenticated, router, user]);

  useEffect(() => {
    check();
  }, [check]);

  return <>{children}</>;
}
