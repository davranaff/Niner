import { keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { useFetch, useMutate } from 'src/hooks/api';
import type { AdminLoadMorePage } from 'src/sections/apps/admin/types';
import {
  appendToAdminLoadMorePage,
  buildAdminLoadMoreParams,
  removeFromAdminLoadMorePage,
  toAdminLoadMorePage,
  updateInAdminLoadMorePage,
} from 'src/sections/apps/admin/utils';

import {
  createAdminReadingAnswer,
  createAdminReadingBlock,
  createAdminReadingOption,
  createAdminReadingPassage,
  createAdminReadingQuestion,
  createAdminReadingTest,
  deleteAdminReadingAnswer,
  deleteAdminReadingBlock,
  deleteAdminReadingOption,
  deleteAdminReadingPassage,
  deleteAdminReadingQuestion,
  deleteAdminReadingTest,
  fetchAdminReadingList,
  fetchAdminReadingPublicDetail,
  fetchAdminReadingSettings,
  updateAdminReadingAnswer,
  updateAdminReadingBlock,
  updateAdminReadingOption,
  updateAdminReadingPassage,
  updateAdminReadingQuestion,
  updateAdminReadingTest,
} from './reading-requests';
import { mergeAdminReadingDetail, READING_ADMIN_BATCH_SIZE } from './utils';
import type {
  AdminReadingAnswerFormValues,
  AdminReadingBlockFormValues,
  AdminReadingDetail,
  AdminReadingListItem,
  AdminReadingOptionFormValues,
  AdminReadingPassageFormValues,
  AdminReadingQuestionFormValues,
  AdminReadingTestFormValues,
} from './types';

const adminReadingQueryRoot = ['admin-reading'] as const;

export const adminReadingQueryKeys = {
  root: adminReadingQueryRoot,
  listRoot: [...adminReadingQueryRoot, 'list'] as const,
  list: (page: number, batchSize: number) =>
    [...adminReadingQueryRoot, 'list', { page, batchSize }] as const,
  detail: (testId: number) => [...adminReadingQueryRoot, 'detail', testId] as const,
};

function setReadingListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: AdminLoadMorePage<AdminReadingListItem> | undefined) => AdminLoadMorePage<AdminReadingListItem> | undefined
) {
  queryClient.setQueriesData<AdminLoadMorePage<AdminReadingListItem> | undefined>(
    { queryKey: adminReadingQueryKeys.listRoot },
    updater
  );
}

export function useAdminReadingListQuery(page: number, batchSize = READING_ADMIN_BATCH_SIZE) {
  return useFetch(
    adminReadingQueryKeys.list(page, batchSize),
    async () => {
      const response = await fetchAdminReadingList(buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminReadingDetailQuery(testId: number) {
  return useFetch(
    adminReadingQueryKeys.detail(testId),
    async () => {
      const [settings, detail] = await Promise.all([
        fetchAdminReadingSettings(testId),
        fetchAdminReadingPublicDetail(testId),
      ]);

      return mergeAdminReadingDetail(detail, settings);
    },
    { enabled: testId > 0 }
  );
}

export function useAdminReadingTestMutations() {
  const queryClient = useQueryClient();

  const createTest = useMutate(async (payload: AdminReadingTestFormValues) => {
    const response = await createAdminReadingTest(payload);

    return {
      ...payload,
      id: response.id,
    };
  }, {
    onSuccess: (item) => {
      setReadingListCaches(queryClient, appendToAdminLoadMorePage(item));
    },
  });

  const updateTest = useMutate(
    async ({ testId, payload }: { testId: number; payload: AdminReadingTestFormValues }) => {
      await updateAdminReadingTest(testId, payload);

      return {
        ...payload,
        id: testId,
      };
    },
    {
      onSuccess: (item) => {
        setReadingListCaches(queryClient, updateInAdminLoadMorePage(item));
        queryClient.setQueryData<AdminReadingDetail | undefined>(
          adminReadingQueryKeys.detail(item.id),
          (current) => (current ? { ...current, ...item } : current)
        );
      },
    }
  );

  const deleteTest = useMutate(async (testId: number) => {
    await deleteAdminReadingTest(testId);
    return testId;
  }, {
    onSuccess: (testId) => {
      setReadingListCaches(queryClient, removeFromAdminLoadMorePage(testId));
      queryClient.removeQueries({ queryKey: adminReadingQueryKeys.detail(testId) });
    },
  });

  return {
    createTest,
    updateTest,
    deleteTest,
  };
}

export function useAdminReadingDetailMutations(testId: number) {
  const queryClient = useQueryClient();

  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: adminReadingQueryKeys.detail(testId) });

  const createPassage = useMutate(
    ({ payload }: { payload: AdminReadingPassageFormValues }) =>
      createAdminReadingPassage(testId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updatePassage = useMutate(
    ({ passageId, payload }: { passageId: number; payload: AdminReadingPassageFormValues }) =>
      updateAdminReadingPassage(passageId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deletePassage = useMutate((passageId: number) => deleteAdminReadingPassage(passageId), {
    onSuccess: invalidateDetail,
  });

  const createBlock = useMutate(
    ({ passageId, payload }: { passageId: number; payload: AdminReadingBlockFormValues }) =>
      createAdminReadingBlock(passageId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateBlock = useMutate(
    ({ blockId, payload }: { blockId: number; payload: AdminReadingBlockFormValues }) =>
      updateAdminReadingBlock(blockId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteBlock = useMutate((blockId: number) => deleteAdminReadingBlock(blockId), {
    onSuccess: invalidateDetail,
  });

  const createQuestion = useMutate(
    ({ blockId, payload }: { blockId: number; payload: AdminReadingQuestionFormValues }) =>
      createAdminReadingQuestion(blockId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateQuestion = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminReadingQuestionFormValues }) =>
      updateAdminReadingQuestion(questionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteQuestion = useMutate((questionId: number) => deleteAdminReadingQuestion(questionId), {
    onSuccess: invalidateDetail,
  });

  const createOption = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminReadingOptionFormValues }) =>
      createAdminReadingOption(questionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const updateOption = useMutate(
    ({ optionId, payload }: { optionId: number; payload: AdminReadingOptionFormValues }) =>
      updateAdminReadingOption(optionId, payload),
    {
      onSuccess: invalidateDetail,
    }
  );

  const deleteOption = useMutate((optionId: number) => deleteAdminReadingOption(optionId), {
    onSuccess: invalidateDetail,
  });

  const createAnswer = useMutate(
    ({ questionId, payload }: { questionId: number; payload: AdminReadingAnswerFormValues }) =>
      createAdminReadingAnswer(questionId, payload)
  );

  const updateAnswer = useMutate(
    ({ answerId, payload }: { answerId: number; payload: AdminReadingAnswerFormValues }) =>
      updateAdminReadingAnswer(answerId, payload)
  );

  const deleteAnswer = useMutate((answerId: number) => deleteAdminReadingAnswer(answerId));

  return {
    createPassage,
    updatePassage,
    deletePassage,
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
