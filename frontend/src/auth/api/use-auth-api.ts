import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { useMutate } from 'src/hooks/api';

import { fetchConfirm, fetchLogin, fetchRegister } from './auth-requests';
import {
  createMockAuthResponseFromLogin,
  createMockAuthResponseFromRegister,
  isJwtAuthMock,
  isJwtSignInMock,
} from '../context/jwt/mock-auth';
import {
  type ConfirmRequest,
  type LoginRequest,
  type RegisterMutationResult,
  type RegisterRequest,
  type TokenPairResponse,
  isTokenPairResponse,
} from './types';

// ----------------------------------------------------------------------

export function useLoginMutation() {
  const { syncSessionFromApiResponse } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutate<TokenPairResponse, LoginRequest>(
    async (data) => {
      if (isJwtSignInMock()) {
        return createMockAuthResponseFromLogin(data);
      }
      return fetchLogin(data);
    },
    {
      skipGlobalErrorNotification: true,
      onSuccess: (payload) => {
        syncSessionFromApiResponse(payload);
        queryClient.invalidateQueries();
      },
    }
  );
}

export function useRegisterMutation() {
  const { syncSessionFromApiResponse } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutate<RegisterMutationResult, RegisterRequest>(
    async (data) => {
      if (isJwtAuthMock()) {
        return createMockAuthResponseFromRegister(data);
      }
      return fetchRegister(data);
    },
    {
      skipGlobalErrorNotification: true,
      onSuccess: (payload) => {
        if (isTokenPairResponse(payload)) {
          syncSessionFromApiResponse(payload);
          queryClient.invalidateQueries();
        }
      },
    }
  );
}

export function useConfirmMutation() {
  const { syncSessionFromApiResponse } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutate<TokenPairResponse, string | ConfirmRequest>(
    async (data) => fetchConfirm(data),
    {
      skipGlobalErrorNotification: true,
      onSuccess: (payload) => {
        syncSessionFromApiResponse(payload);
        queryClient.invalidateQueries();
      },
    }
  );
}

/**
 * Client-only logout: clears tokens, user cache, and React Query (no blacklist call).
 */
export function useLogoutMutation() {
  const { logout } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => undefined,
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}
