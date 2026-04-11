import { API_ENDPOINTS } from 'src/lib/api/endpoints';

/** Auth paths aligned with FastAPI auth/users routes. */
export const AUTH_URLS = {
  login: API_ENDPOINTS.auth.signIn,
  signUp: API_ENDPOINTS.auth.signUp,
  confirm: API_ENDPOINTS.auth.confirm,
  refresh: API_ENDPOINTS.auth.refresh,
  me: API_ENDPOINTS.users.me,
} as const;
