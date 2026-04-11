import { useEffect, useReducer, useCallback, useMemo } from 'react';

import { fetchCurrentUser, fetchLogin, fetchRegister } from 'src/auth/api/auth-requests';
import { AUTH_USER_KEY, REFRESH_TOKEN_KEY } from 'src/auth/api/storage-keys';
import type { LoginRequest, RegisterRequest, TokenPairResponse } from 'src/auth/api/types';

import { AuthContext } from './auth-context';
import { isValidToken, setSession } from './utils';
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

const STORAGE_KEY = 'accessToken';

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUserType) : null;
  } catch {
    return null;
  }
}

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const syncSessionFromApiResponse = useCallback((payload: TokenPairResponse) => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
    setSession(payload.access);
    dispatch({
      type: Types.LOGIN,
      payload: { user: payload.user },
    });
  }, []);

  const initialize = useCallback(async () => {
    try {
      const accessToken = sessionStorage.getItem(STORAGE_KEY);

      if (accessToken && isValidToken(accessToken)) {
        setSession(accessToken);

        if (isJwtAuthMock() && isJwtSignInMock()) {
          dispatch({
            type: Types.INITIAL,
            payload: {
              user: readStoredUser(),
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
          dispatch({
            type: Types.INITIAL,
            payload: {
              user: readStoredUser(),
            },
          });
        }
      } else {
        dispatch({
          type: Types.INITIAL,
          payload: {
            user: null,
          },
        });
      }
    } catch {
      dispatch({
        type: Types.INITIAL,
        payload: {
          user: null,
        },
      });
    }
  }, []);

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
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    setSession(null);
    dispatch({
      type: Types.LOGOUT,
    });
  }, []);

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
