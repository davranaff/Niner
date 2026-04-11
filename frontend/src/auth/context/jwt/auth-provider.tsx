import { useEffect, useReducer, useCallback, useMemo } from 'react';

import { fetchCurrentUser, fetchLogin, fetchRefresh, fetchRegister } from 'src/auth/api/auth-requests';
import type { LoginRequest, RegisterRequest, TokenPairResponse } from 'src/auth/api/types';
import {
  clearStoredAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  isValidToken,
  redirectToLogin,
  registerSessionExpiryHandler,
  syncStoredAccessToken,
  syncStoredAuthSession,
} from 'src/auth/api/session';

import { AuthContext } from './auth-context';
import {
  createMockAuthResponseFromLogin,
  createMockAuthResponseFromRegister,
  isJwtAuthMock,
  isJwtSignInMock,
} from './mock-auth';
import { ActionMapType, AuthStateType, AuthUserType } from '../../types';

// ----------------------------------------------------------------------

enum Types {
  INITIAL = 'INITIAL',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  LOGOUT = 'LOGOUT',
}

type Payload = {
  [Types.INITIAL]: {
    user: AuthUserType;
  };
  [Types.LOGIN]: {
    user: AuthUserType;
  };
  [Types.REGISTER]: {
    user: AuthUserType;
  };
  [Types.LOGOUT]: undefined;
};

type ActionsType = ActionMapType<Payload>[keyof ActionMapType<Payload>];

// ----------------------------------------------------------------------

const initialState: AuthStateType = {
  user: null,
  loading: true,
};

const reducer = (state: AuthStateType, action: ActionsType) => {
  if (action.type === Types.INITIAL) {
    return {
      loading: false,
      user: action.payload.user,
    };
  }
  if (action.type === Types.LOGIN) {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === Types.REGISTER) {
    return {
      ...state,
      user: action.payload.user,
    };
  }
  if (action.type === Types.LOGOUT) {
    return {
      ...state,
      user: null,
    };
  }
  return state;
};

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const applySessionPayload = useCallback((payload: TokenPairResponse, type: Types.INITIAL | Types.LOGIN) => {
    syncStoredAuthSession(payload);
    dispatch({
      type,
      payload: { user: payload.user },
    });
  }, []);

  const syncSessionFromApiResponse = useCallback(
    (payload: TokenPairResponse) => {
      applySessionPayload(payload, Types.LOGIN);
    },
    [applySessionPayload]
  );

  const clearSession = useCallback(
    (type: Types.INITIAL | Types.LOGOUT = Types.LOGOUT) => {
      clearStoredAuthSession();

      if (type === Types.LOGOUT) {
        dispatch({
          type: Types.LOGOUT,
        });
        return;
      }

      dispatch({
        type: Types.INITIAL,
        payload: {
          user: null,
        },
      });
    },
    []
  );

  const refreshSession = useCallback(
    async (type: Types.INITIAL | Types.LOGIN = Types.LOGIN) => {
      const refreshToken = getStoredRefreshToken();

      if (!refreshToken || isJwtAuthMock()) {
        return null;
      }

      const payload = await fetchRefresh(refreshToken);
      applySessionPayload(payload, type);
      return payload;
    },
    [applySessionPayload]
  );

  const initialize = useCallback(async () => {
    try {
      const accessToken = getStoredAccessToken();

      if (accessToken && isValidToken(accessToken)) {
        syncStoredAccessToken(accessToken);

        if (isJwtAuthMock() && isJwtSignInMock()) {
          dispatch({
            type: Types.INITIAL,
            payload: {
              user: getStoredUser(),
            },
          });
          return;
        }

        try {
          const { user } = await fetchCurrentUser();
          dispatch({
            type: Types.INITIAL,
            payload: {
              user,
            },
          });
        } catch {
          if (getStoredRefreshToken() && !isJwtAuthMock()) {
            try {
              await refreshSession(Types.INITIAL);
              return;
            } catch {
              // fall through to stored user fallback
            }
          }

          dispatch({
            type: Types.INITIAL,
            payload: {
              user: getStoredUser(),
            },
          });
        }
        return;
      }

      if (getStoredRefreshToken() && !isJwtAuthMock()) {
        try {
          await refreshSession(Types.INITIAL);
        } catch {
          clearSession(Types.INITIAL);
        }
      } else {
        clearSession(Types.INITIAL);
      }
    } catch {
      clearSession(Types.INITIAL);
    }
  }, [clearSession, refreshSession]);

  const handleSessionExpiry = useCallback(async () => {
    if (isJwtAuthMock()) {
      clearSession();
      redirectToLogin();
      return;
    }

    try {
      const payload = await refreshSession();

      if (payload) {
        return;
      }

      clearSession();
      redirectToLogin();
    } catch {
      clearSession();
      redirectToLogin();
    }
  }, [clearSession, refreshSession]);

  useEffect(() => {
    registerSessionExpiryHandler(handleSessionExpiry);

    return () => {
      registerSessionExpiryHandler(null);
    };
  }, [handleSessionExpiry]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      if (isJwtSignInMock()) {
        syncSessionFromApiResponse(createMockAuthResponseFromLogin(credentials));
        return;
      }

      const data = await fetchLogin(credentials);
      syncSessionFromApiResponse(data);
    },
    [syncSessionFromApiResponse]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      if (isJwtAuthMock()) {
        syncSessionFromApiResponse(createMockAuthResponseFromRegister(data));
        return;
      }

      await fetchRegister(data);
    },
    [syncSessionFromApiResponse]
  );

  const logout = useCallback(async () => {
    clearSession();
  }, [clearSession]);

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      method: 'jwt',
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
      syncSessionFromApiResponse,
      login,
      register,
      logout,
    }),
    [login, logout, register, state.user, status, syncSessionFromApiResponse]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
