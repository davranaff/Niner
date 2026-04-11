import type {
  LoginRequest,
  RegisterRequest,
  TenantUser,
  TokenPairResponse,
  UserRole,
} from 'src/auth/api/types';
import { HOST_API } from 'src/config-global';
import {
  findMockUserByEmail,
  registerMockStudent,
} from 'src/sections/apps/common/api/apps-service';

// ----------------------------------------------------------------------

export const isJwtAuthMock = () => {
  const authMockFlag = process.env.REACT_APP_AUTH_MOCK;

  if (authMockFlag === 'true') {
    return true;
  }

  if (authMockFlag === 'false') {
    return false;
  }

  return !String(HOST_API ?? '').trim();
};

/**
 * Sign-in is wired to the real backend whenever `HOST_API` is configured,
 * even if the rest of auth flows are still mocked.
 */
export const isJwtSignInMock = () => !String(HOST_API ?? '').trim();

function encodeBase64Url(obj: object) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** JWT-shaped string so `isValidToken` / `setSession` keep working (signature not verified). */
export function createMockAccessToken(expiresInSec = 60 * 60 * 24 * 365) {
  const header = encodeBase64Url({ alg: 'none', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const payload = encodeBase64Url({ exp });
  return `${header}.${payload}.mock`;
}

function toTenantUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  targetBand?: number;
}): TenantUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: null,
    createdAt: user.createdAt,
    targetBand: user.targetBand || null,
  };
}

export function buildMockAuthUser(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  targetBand?: number;
}): TenantUser {
  const existing = findMockUserByEmail(params.email);

  if (existing) {
    return toTenantUser(existing);
  }

  if (params.role === 'teacher') {
    const teacher = findMockUserByEmail('teacher@ieltsmock.dev');
    if (teacher) {
      return toTenantUser(teacher);
    }
  }

  const fallbackName =
    params.firstName || params.lastName
      ? `${params.firstName || ''} ${params.lastName || ''}`.trim()
      : params.email.split('@')[0] || 'Student';

  const student = registerMockStudent({
    name: fallbackName,
    email: params.email,
    targetBand: params.targetBand,
  });

  return toTenantUser(student);
}

export function createMockAuthResponseFromLogin(credentials: LoginRequest): TokenPairResponse {
  const access = createMockAccessToken();
  const user = buildMockAuthUser({
    email: credentials.email,
    role: credentials.mockRole,
  });

  return { access, refresh: '', user };
}

export function createMockAuthResponseFromRegister(data: RegisterRequest): TokenPairResponse {
  const access = createMockAccessToken();
  const user = buildMockAuthUser({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
  });

  return { access, refresh: '', user };
}
