import { paths } from 'src/routes/paths';

import { ACCESS_TOKEN_KEY, AUTH_USER_KEY, REFRESH_TOKEN_KEY } from './storage-keys';
import type { TenantUser, TokenPairResponse } from './types';

const TOKEN_EXPIRY_LEEWAY_MS = 30_000;

let expiryTimer: number | null = null;
let expiryHandler: (() => void | Promise<void>) | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function clearExpiryTimer() {
  if (expiryTimer !== null && isBrowser()) {
    window.clearTimeout(expiryTimer);
  }
  expiryTimer = null;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];

    if (!base64Url) {
      return null;
    }

    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload) as { exp?: number };
  } catch {
    return null;
  }
}

function scheduleTokenExpiry(accessToken: string) {
  clearExpiryTimer();

  if (!isBrowser()) {
    return;
  }

  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;

  if (!exp) {
    return;
  }

  const timeLeft = exp * 1000 - Date.now() - TOKEN_EXPIRY_LEEWAY_MS;

  if (timeLeft <= 0) {
    if (expiryHandler) {
      Promise.resolve(expiryHandler()).catch(() => {});
    }
    return;
  }

  expiryTimer = window.setTimeout(() => {
    if (expiryHandler) {
      Promise.resolve(expiryHandler()).catch(() => {});
    }
  }, timeLeft);
}

export function registerSessionExpiryHandler(handler: (() => void | Promise<void>) | null) {
  expiryHandler = handler;
}

export function getStoredAccessToken() {
  if (!isBrowser()) {
    return null;
  }

  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  if (!isBrowser()) {
    return null;
  }

  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);

    return raw ? (JSON.parse(raw) as TenantUser) : null;
  } catch {
    return null;
  }
}

export function isValidToken(accessToken: string) {
  if (!accessToken || !isBrowser()) {
    return false;
  }

  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;

  if (!exp) {
    return false;
  }

  return exp > Date.now() / 1000;
}

export function syncStoredAccessToken(accessToken: string | null) {
  if (!isBrowser()) {
    return;
  }

  if (!accessToken) {
    clearExpiryTimer();
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  scheduleTokenExpiry(accessToken);
}

export function syncStoredAuthSession(payload: TokenPairResponse) {
  if (!isBrowser()) {
    return;
  }

  sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
  syncStoredAccessToken(payload.access);
}

export function clearStoredAuthSession() {
  if (!isBrowser()) {
    return;
  }

  clearExpiryTimer();
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function redirectToLogin() {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== paths.auth.jwt.login) {
    window.location.href = paths.auth.jwt.login;
  }
}
