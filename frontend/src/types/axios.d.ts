import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Do not send `Authorization` (e.g. login, register, refresh, public pages).
     * Prevents a stale session token from being sent on auth endpoints.
     */
    skipAuth?: boolean;
    /**
     * Internal auth flag: don't trigger token refresh retry for this request.
     */
    skipAuthRefresh?: boolean;
    /**
     * Internal auth flag: request was already retried once after refresh.
     */
    retryAfterRefresh?: boolean;
  }
}
