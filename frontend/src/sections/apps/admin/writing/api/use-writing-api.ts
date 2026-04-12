import { keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';
import type { AdminLoadMorePage } from 'src/sections/apps/admin/types';
import {
  appendToAdminLoadMorePage,
  buildAdminLoadMoreParams,
  removeFromAdminLoadMorePage,
  scanAdminListItemById,
  toAdminLoadMorePage,
  updateInAdminLoadMorePage,
} from 'src/sections/apps/admin/utils';

import {
  createAdminWritingPart,
  createAdminWritingTest,
  deleteAdminWritingPart,
  deleteAdminWritingTest,
  fetchAdminWritingList,
  fetchAdminWritingPublicDetail,
  updateAdminWritingPart,
  updateAdminWritingTest,
} from './writing-requests';
import { mergeAdminWritingDetail, toWritingPartPayload, WRITING_ADMIN_BATCH_SIZE } from './utils';
import type {
  AdminWritingDetail,
  AdminWritingListItem,
  AdminWritingPartFormValues,
  AdminWritingTestFormValues,
} from './types';

const adminWritingQueryRoot = ['admin-writing'] as const;

export const adminWritingQueryKeys = {
  root: adminWritingQueryRoot,
  listRoot: [...adminWritingQueryRoot, 'list'] as const,
  list: (page: number, batchSize: number) =>
    [...adminWritingQueryRoot, 'list', { page, batchSize }] as const,
  detail: (testId: number) => [...adminWritingQueryRoot, 'detail', testId] as const,
};

function setWritingListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: AdminLoadMorePage<AdminWritingListItem> | undefined) => AdminLoadMorePage<AdminWritingListItem> | undefined
) {
  queryClient.setQueriesData<AdminLoadMorePage<AdminWritingListItem> | undefined>(
    { queryKey: adminWritingQueryKeys.listRoot },
    updater
  );
}

export function useAdminWritingListQuery(page: number, batchSize = WRITING_ADMIN_BATCH_SIZE) {
  return useFetch(
    adminWritingQueryKeys.list(page, batchSize),
    async () => {
      const response = await fetchAdminWritingList(buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminWritingDetailQuery(testId: number) {
  return useFetch(
    adminWritingQueryKeys.detail(testId),
    async () => {
      const [detail, settings] = await Promise.all([
        fetchAdminWritingPublicDetail(testId),
        scanAdminListItemById(testId, fetchAdminWritingList),
      ]);

      if (!settings) {
        throw new Error(`Writing test ${testId} not found`);
      }

      return mergeAdminWritingDetail(detail, settings);
    },
    { enabled: testId > 0 }
  );
}

export function useAdminWritingTestMutations() {
  const queryClient = useQueryClient();

  const createTest = useMutate(async (payload: AdminWritingTestFormValues) => {
    const response = await createAdminWritingTest(payload);

    return {
      ...payload,
      id: response.id,
    };
  }, {
    onSuccess: (item) => {
      setWritingListCaches(queryClient, appendToAdminLoadMorePage(item));
    },
  });

  const updateTest = useMutate(
    async ({ testId, payload }: { testId: number; payload: AdminWritingTestFormValues }) => {
      await updateAdminWritingTest(testId, payload);

      return {
        ...payload,
        id: testId,
      };
    },
    {
      onSuccess: (item) => {
        setWritingListCaches(queryClient, updateInAdminLoadMorePage(item));
        queryClient.setQueryData<AdminWritingDetail | undefined>(
          adminWritingQueryKeys.detail(item.id),
          (current) => (current ? { ...current, ...item } : current)
        );
      },
    }
  );

  const deleteTest = useMutate(async (testId: number) => {
    await deleteAdminWritingTest(testId);
    return testId;
  }, {
    onSuccess: (testId) => {
      setWritingListCaches(queryClient, removeFromAdminLoadMorePage(testId));
      queryClient.removeQueries({ queryKey: adminWritingQueryKeys.detail(testId) });
    },
  });

  return {
    createTest,
    updateTest,
    deleteTest,
  };
}

export function useAdminWritingDetailMutations(testId: number) {
  const queryClient = useQueryClient();

  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: adminWritingQueryKeys.detail(testId) });

  const createPart = useMutate(
    ({ payload }: { payload: AdminWritingPartFormValues }) =>
      createAdminWritingPart(testId, toWritingPartPayload(payload)),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updatePart = useMutate(
    ({ partId, payload }: { partId: number; payload: AdminWritingPartFormValues }) =>
      updateAdminWritingPart(partId, toWritingPartPayload(payload)),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deletePart = useMutate((partId: number) => deleteAdminWritingPart(partId), {
    onSuccess: invalidateDetail,
  });

  return {
    createPart,
    updatePart,
    deletePart,
  };
}
