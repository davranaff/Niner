/** Active app roles used by Band 9.0. */
export type UserRole = 'admin' | 'accountant' | 'student' | 'teacher' | 'user';
export type RegisterRole = 'student' | 'teacher';

/** Frontend auth user shape stored in session and consumed by the app shell. */
export type TenantUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  createdAt: string;
  targetBand?: number | null;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  verifiedAt?: string | null;
};

/** Frontend-normalized auth response used across the existing JWT context. */
export type TokenPairResponse = {
  access: string;
  refresh: string;
  user: TenantUser;
};

/** Raw FastAPI `/auth/sign-in` and `/auth/refresh` user payload. */
export type BackendAuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  verifiedAt: string | null;
};

/** Raw FastAPI auth response payload before frontend normalization. */
export type BackendAuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  };
  user: BackendAuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
  mockRole?: UserRole;
};

export type ConfirmRequest = {
  token: string;
};

/** Backend `SignUpOut` after camelCase transform. */
export type SignUpResponse = {
  message: string;
  debugConfirmationToken?: string | null;
};

/**
 * Register form + mock payload. Real API uses `firstName`, `lastName`, `email`, `password`, `role`
 * (`passwordConfirm` is client-side; optional fields are mock-only).
 */
export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: RegisterRole;
  passwordConfirm: string;
  tenantName?: string;
  mockRole?: UserRole;
};

export type RegisterMutationResult = TokenPairResponse | SignUpResponse;

export function isTokenPairResponse(value: RegisterMutationResult): value is TokenPairResponse {
  return 'access' in value && typeof (value as TokenPairResponse).access === 'string';
}
