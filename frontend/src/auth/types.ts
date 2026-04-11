import type { LoginRequest, RegisterRequest, TenantUser, TokenPairResponse } from './api/types';

// ----------------------------------------------------------------------

export type ActionMapType<M extends { [index: string]: any }> = {
  [Key in keyof M]: M[Key] extends undefined
    ? {
        type: Key;
      }
    : {
        type: Key;
        payload: M[Key];
      };
};

export type AuthUserType = TenantUser | Record<string, unknown> | null;

export type AuthStateType = {
  status?: string;
  loading: boolean;
  user: AuthUserType;
};

export type JWTContextType = {
  user: AuthUserType;
  method: string;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  /** Apply normalized auth payload and sync React state + session storage. */
  syncSessionFromApiResponse: (payload: TokenPairResponse) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};
