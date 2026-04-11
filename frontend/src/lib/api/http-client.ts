import axios, {
  AxiosRequestTransformer,
  AxiosResponseTransformer,
  InternalAxiosRequestConfig,
} from 'axios';
// eslint-disable-next-line import/no-extraneous-dependencies -- humps is a runtime dep; types are dev-only @types/humps
import humps from 'humps';

import { ACCESS_TOKEN_KEY } from 'src/auth/api/storage-keys';
import { clearStoredAuthSession, getStoredRefreshToken, syncStoredAuthSession } from 'src/auth/api/session';
import type { BackendAuthResponse } from 'src/auth/api/types';
import { normalizeAuthResponse } from 'src/auth/api/utils';
import { HOST_API } from 'src/config-global';
import { API_ENDPOINTS } from 'src/lib/api/endpoints';

// ----------------------------------------------------------------------

const root = String(HOST_API ?? '').replace(/\/$/, '');
let refreshRequest: Promise<string | null> | null = null;

function asRequestTransformers(
  value: AxiosRequestTransformer | AxiosRequestTransformer[] | undefined
): AxiosRequestTransformer[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function asResponseTransformers(
  value: AxiosResponseTransformer | AxiosResponseTransformer[] | undefined
): AxiosResponseTransformer[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function decamelizeRequestBody(data: unknown): unknown {
  if (data instanceof FormData) {
    return data;
  }
  if (data == null || typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  if (Array.isArray(data) || typeof data === 'object') {
    return humps.decamelizeKeys(data as Record<string, unknown>);
  }
  return data;
}

function camelizeResponseData(data: unknown): unknown {
  if (data == null || typeof data !== 'object') {
    return data;
  }
  return humps.camelizeKeys(data as Record<string, unknown>);
}

function hasWindowSession() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

async function refreshAccessToken() {
  if (!hasWindowSession()) {
    return null;
  }

  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = axios
      .post(`${root}${API_ENDPOINTS.auth.refresh}`, {
        refresh_token: refreshToken,
      })
      .then(({ data }) => {
        const payload = normalizeAuthResponse(
          humps.camelizeKeys(data as Record<string, unknown>) as BackendAuthResponse
        );
        syncStoredAuthSession(payload);
        return payload.access;
      })
      .catch((error) => {
        clearStoredAuthSession();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

/**
 * Axios instance for this app: `HOST_API` origin, snake_case ↔ camelCase for JSON bodies
 * and plain object query params, JWT from `sessionStorage` unless `skipAuth` is set.
 */
export const apiClient = axios.create({
  baseURL: root || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
  transformRequest: [decamelizeRequestBody, ...asRequestTransformers(axios.defaults.transformRequest)],
  transformResponse: [
    ...asResponseTransformers(axios.defaults.transformResponse),
    camelizeResponseData,
  ],
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const next: InternalAxiosRequestConfig = { ...config };

  if (next.data instanceof FormData && next.headers) {
    delete (next.headers as Record<string, unknown>)['Content-Type'];
  }

  const { params } = next;
  if (
    params &&
    typeof params === 'object' &&
    !(params instanceof URLSearchParams) &&
    !Array.isArray(params)
  ) {
    next.params = humps.decamelizeKeys(params as Record<string, unknown>);
  }

  if (!next.skipAuth && typeof window !== 'undefined') {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      next.headers = next.headers ?? {};
      (next.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  return next;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const responseStatus = error.response?.status;
    const originalRequest = error.config;

    if (
      responseStatus !== 401 ||
      !originalRequest ||
      originalRequest.skipAuth ||
      originalRequest.skipAuthRefresh ||
      originalRequest.retryAfterRefresh
    ) {
      return Promise.reject(error);
    }

    try {
      const nextAccessToken = await refreshAccessToken();

      if (!nextAccessToken) {
        throw error;
      }

      originalRequest.retryAfterRefresh = true;
      originalRequest.headers = originalRequest.headers ?? {};
      (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${nextAccessToken}`;

      return await apiClient.request(originalRequest);
    } catch (refreshError) {
      clearStoredAuthSession();
      throw refreshError ?? error;
    }
  }
);
