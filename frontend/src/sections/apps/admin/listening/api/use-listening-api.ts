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
  createAdminListeningAnswer,
  createAdminListeningBlock,
  createAdminListeningOption,
  createAdminListeningPart,
  createAdminListeningQuestion,
  createAdminListeningTest,
  deleteAdminListeningAnswer,
  deleteAdminListeningBlock,
  deleteAdminListeningOption,
  deleteAdminListeningPart,
  deleteAdminListeningQuestion,
  deleteAdminListeningTest,
  fetchAdminListeningList,
  fetchAdminListeningPublicDetail,
  updateAdminListeningAnswer,
  updateAdminListeningBlock,
  updateAdminListeningOption,
  updateAdminListeningPart,
  updateAdminListeningQuestion,
  updateAdminListeningTest,
} from './listening-requests';
import { LISTENING_ADMIN_BATCH_SIZE, mergeAdminListeningDetail } from './utils';
import type {
  AdminListeningAnswerFormValues,
  AdminListeningBlockFormValues,
  AdminListeningDetail,
  AdminListeningListItem,
  AdminListeningOptionFormValues,
  AdminListeningPartFormValues,
  AdminListeningQuestionFormValues,
  AdminListeningTestFormValues,
} from './types';

const adminListeningQueryRoot = ['admin-listening'] as const;

export const adminListeningQueryKeys = {
  root: adminListeningQueryRoot,
  listRoot: [...adminListeningQueryRoot, 'list'] as const,
  list: (page: number, batchSize: number) =>
    [...adminListeningQueryRoot, 'list', { page, batchSize }] as const,
  detail: (testId: number) => [...adminListeningQueryRoot, 'detail', testId] as const,
};

function setListeningListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: AdminLoadMorePage<AdminListeningListItem> | undefined) => AdminLoadMorePage<AdminListeningListItem> | undefined
) {
  queryClient.setQueriesData<AdminLoadMorePage<AdminListeningListItem> | undefined>(
    { queryKey: adminListeningQueryKeys.listRoot },
    updater
  );
}

export function useAdminListeningListQuery(page: number, batchSize = LISTENING_ADMIN_BATCH_SIZE) {
  return useFetch(
    adminListeningQueryKeys.list(page, batchSize),
    async () => {
      const response = await fetchAdminListeningList(buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminListeningDetailQuery(testId: number) {
  return useFetch(
    adminListeningQueryKeys.detail(testId),
    async () => {
      const [detail, settings] = await Promise.all([
        fetchAdminListeningPublicDetail(testId),
        scanAdminListItemById(testId, fetchAdminListeningList),
      ]);

      if (!settings) {
        throw new Error(`Listening test ${testId} not found`);
      }

      return mergeAdminListeningDetail(detail, settings);
    },
    { enabled: testId > 0 }
  );
}

export function useAdminListeningTestMutations() {
  const queryClient = useQueryClient();

  const createTest = useMutate(async (payload: AdminListeningTestFormValues) => {
    const response = await createAdminListeningTest(payload);

    return {
      ...payload,
      id: response.id,
      voiceUrl: payload.voiceUrl || null,
    };
  }, {
    onSuccess: (item) => {
      setListeningListCaches(queryClient, appendToAdminLoadMorePage(item));
    },
  });

  const updateTest = useMutate(
    async ({ testId, payload }: { testId: number; payload: AdminListeningTestFormValues }) => {
      await updateAdminListeningTest(testId, payload);

      return {
        ...payload,
        id: testId,
        voiceUrl: payload.voiceUrl || null,
      };
    },
    {
      onSuccess: (item) => {
        setListeningListCaches(queryClient, updateInAdminLoadMorePage(item));
        queryClient.setQueryData<AdminListeningDetail | undefined>(
          adminListeningQueryKeys.detail(item.id),
          (current) => (current ? { ...current, ...item } : current)
        );
      },
    }
  );

  const deleteTest = useMutate(async (testId: number) => {
    await deleteAdminListeningTest(testId);
    return testId;
  }, {
    onSuccess: (testId) => {
      setListeningListCaches(queryClient, removeFromAdminLoadMorePage(testId));
      queryClient.removeQueries({ queryKey: adminListeningQueryKeys.detail(testId) });
    },
  });

  return {
    createTest,
    updateTest,
    deleteTest,
  };
}

export function useAdminListeningDetailMutations(testId: number) {
  const queryClient = useQueryClient();

  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: adminListeningQueryKeys.detail(testId) });

  const createPart = useMutate(
    ({ payload }: { payload: AdminListeningPartFormValues }) =>
      createAdminListeningPart(testId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updatePart = useMutate(
    ({ partId, payload }: { partId: number; payload: AdminListeningPartFormValues }) =>
      updateAdminListeningPart(partId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deletePart = useMutate((partId: number) => deleteAdminListeningPart(partId), {
    onSuccess: invalidateDetail,
  });

  const createBlock = useMutate(
    ({ partId, payload }: { partId: number; payload: AdminListeningBlockFormValues }) =>
      createAdminListeningBlock(partId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateBlock = useMutate(
    ({ blockId, payload }: { blockId: number; payload: AdminListeningBlockFormValues }) =>
      updateAdminListeningBlock(blockId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteBlock = useMutate((blockId: number) => deleteAdminListeningBlock(blockId), {
    onSuccess: invalidateDetail,
  });

  const createQuestion = useMutate(
    ({ blockId, payload }: { blockId: number; payload: AdminListeningQuestionFormValues }) =>
      createAdminListeningQuestion(blockId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateQuestion = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminListeningQuestionFormValues }) =>
      updateAdminListeningQuestion(questionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteQuestion = useMutate((questionId: number) => deleteAdminListeningQuestion(questionId), {
    onSuccess: invalidateDetail,
  });

  const createOption = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminListeningOptionFormValues }) =>
      createAdminListeningOption(questionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateOption = useMutate(
    ({ optionId, payload }: { optionId: number; payload: AdminListeningOptionFormValues }) =>
      updateAdminListeningOption(optionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteOption = useMutate((optionId: number) => deleteAdminListeningOption(optionId), {
    onSuccess: invalidateDetail,
  });

  const createAnswer = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminListeningAnswerFormValues }) =>
      createAdminListeningAnswer(questionId, payload)
  );

  const updateAnswer = useMutate(
    ({ answerId, payload }: { answerId: number; payload: AdminListeningAnswerFormValues }) =>
      updateAdminListeningAnswer(answerId, payload)
  );

  const deleteAnswer = useMutate((answerId: number) => deleteAdminListeningAnswer(answerId));

  return {
    createPart,
    updatePart,
    deletePart,
    createBlock,
    updateBlock,
    deleteBlock,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createOption,
    updateOption,
    deleteOption,
    createAnswer,
    updateAnswer,
    deleteAnswer,
  };
}
