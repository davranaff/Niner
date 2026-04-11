import { clearStoredAuthSession, isValidToken, syncStoredAccessToken } from 'src/auth/api/session';

export { isValidToken };

export const setSession = (accessToken: string | null) => {
  if (accessToken) {
    syncStoredAccessToken(accessToken);
    return;
  }

  clearStoredAuthSession();
};
