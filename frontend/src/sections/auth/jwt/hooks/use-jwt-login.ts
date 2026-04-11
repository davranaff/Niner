import { useCallback, useMemo, useState } from 'react';
import type { UseFormReset } from 'react-hook-form';

import { useLoginMutation } from 'src/auth/api';
import type { UserRole } from 'src/auth/api';
import { isJwtSignInMock } from 'src/auth/context/jwt/mock-auth';
import { useSearchParams } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import { getAuthFormErrorMessage } from 'src/utils/api-error-messages';

import { getLoginDemoCredentials } from '../utils/login-demo-credentials';

// ----------------------------------------------------------------------

export type JwtLoginFormValues = {
  email: string;
  password: string;
};

export function useJwtLogin() {
  const loginMutation = useLoginMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const signInIsMock = isJwtSignInMock();

  const { student: studentDemo, teacher: teacherDemo } = useMemo(
    () => getLoginDemoCredentials(signInIsMock),
    [signInIsMock]
  );

  const redirectAfterLogin = useCallback(
    (role: UserRole) => {
      window.location.href = returnTo || paths.afterLogin(role);
    },
    [returnTo]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string, mockRole?: UserRole) => {
      const payload = await loginMutation.mutateAsync({
        email,
        password,
        ...(signInIsMock && mockRole ? { mockRole } : {}),
      });
      redirectAfterLogin(payload.user.role);
    },
    [loginMutation, redirectAfterLogin, signInIsMock]
  );

  const onSubmit = useCallback(
    async (data: JwtLoginFormValues) => {
      try {
        setErrorMsg('');
        await loginWithCredentials(data.email, data.password);
      } catch (error) {
        setErrorMsg(getAuthFormErrorMessage(error, 'login'));
      }
    },
    [loginWithCredentials]
  );

  const onDemoLogin = useCallback(
    async (role: 'student' | 'teacher', reset: UseFormReset<JwtLoginFormValues>) => {
      const demo = role === 'teacher' ? teacherDemo : studentDemo;
      reset(demo);
      try {
        setErrorMsg('');
        await loginWithCredentials(demo.email, demo.password, role);
      } catch (error) {
        setErrorMsg(getAuthFormErrorMessage(error, 'login'));
      }
    },
    [loginWithCredentials, studentDemo, teacherDemo]
  );

  return {
    errorMsg,
    setErrorMsg,
    loginMutation,
    signInIsMock,
    studentDemo,
    teacherDemo,
    onSubmit,
    onDemoLogin,
  };
}
