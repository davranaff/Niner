import { request } from 'src/utils/axios';

import { AUTH_URLS } from './urls';
import type {
  BackendAuthResponse,
  BackendAuthUser,
  ConfirmRequest,
  LoginRequest,
  RegisterRequest,
  SignUpResponse,
  TenantUser,
  TokenPairResponse,
} from './types';
import { normalizeAuthResponse, normalizeTenantUser } from './utils';

export async function fetchLogin(data: LoginRequest): Promise<TokenPairResponse> {
  const payload = await request<BackendAuthResponse>(
    {
      method: 'POST',
      url: AUTH_URLS.login,
      data: {
        email: data.email,
        password: data.password,
      },
    },
    true
  );

  return normalizeAuthResponse(payload);
}

export async function fetchRefresh(refreshToken: string): Promise<TokenPairResponse> {
  const payload = await request<BackendAuthResponse>(
    {
      method: 'POST',
      url: AUTH_URLS.refresh,
      data: {
        refreshToken,
      },
    },
    true
  );

  return normalizeAuthResponse(payload);
}

export async function fetchRegister(data: RegisterRequest): Promise<SignUpResponse> {
  return request<SignUpResponse>(
    {
      method: 'POST',
      url: AUTH_URLS.signUp,
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role,
      },
    },
    true
  );
}

export async function fetchConfirm(data: string | ConfirmRequest): Promise<TokenPairResponse> {
  const token = typeof data === 'string' ? data : data.token;

  const payload = await request<BackendAuthResponse>(
    {
      method: 'POST',
      url: AUTH_URLS.confirm,
      data: { token },
    },
    true
  );

  return normalizeAuthResponse(payload);
}

export async function fetchCurrentUser(): Promise<{ user: TenantUser }> {
  const user = await request<BackendAuthUser>({
    method: 'GET',
    url: AUTH_URLS.me,
  });

  return { user: normalizeTenantUser(user) };
}
