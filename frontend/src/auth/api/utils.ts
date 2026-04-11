import type { BackendAuthResponse, BackendAuthUser, TenantUser, TokenPairResponse } from './types';

export function normalizeTenantUser(user: BackendAuthUser): TenantUser {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  return {
    id: String(user.id),
    name,
    email: user.email,
    role: user.role,
    tenantId: null,
    createdAt: user.verifiedAt ?? '',
    targetBand: null,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    verifiedAt: user.verifiedAt,
  };
}

export function normalizeAuthResponse(payload: BackendAuthResponse): TokenPairResponse {
  return {
    access: payload.tokens.accessToken,
    refresh: payload.tokens.refreshToken,
    user: normalizeTenantUser(payload.user),
  };
}
