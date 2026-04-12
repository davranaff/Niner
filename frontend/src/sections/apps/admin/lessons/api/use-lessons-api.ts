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
  createAdminLesson,
  createAdminLessonCategory,
  deleteAdminLesson,
  deleteAdminLessonCategory,
  fetchAdminLessonCategories,
  fetchAdminLessons,
  updateAdminLesson,
  updateAdminLessonCategory,
} from './lessons-requests';
import {
  ADMIN_LESSON_BATCH_SIZE,
  ADMIN_LESSON_CATEGORY_BATCH_SIZE,
} from './utils';
import type {
  AdminLesson,
  AdminLessonCategory,
  AdminLessonCategoryFormValues,
  AdminLessonFormValues,
} from './types';

const adminLessonsQueryRoot = ['admin-lessons'] as const;

export const adminLessonsQueryKeys = {
  root: adminLessonsQueryRoot,
  categoriesRoot: [...adminLessonsQueryRoot, 'categories'] as const,
  categories: (page: number, batchSize: number) =>
    [...adminLessonsQueryRoot, 'categories', { page, batchSize }] as const,
  lessonsRoot: [...adminLessonsQueryRoot, 'lessons'] as const,
  lessons: (page: number, batchSize: number) =>
    [...adminLessonsQueryRoot, 'lessons', { page, batchSize }] as const,
};

function setCategoryCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (
    current: AdminLoadMorePage<AdminLessonCategory> | undefined
  ) => AdminLoadMorePage<AdminLessonCategory> | undefined
) {
  queryClient.setQueriesData<AdminLoadMorePage<AdminLessonCategory> | undefined>(
    { queryKey: adminLessonsQueryKeys.categoriesRoot },
    updater
  );
}

function setLessonCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (
    current: AdminLoadMorePage<AdminLesson> | undefined
  ) => AdminLoadMorePage<AdminLesson> | undefined
) {
  queryClient.setQueriesData<AdminLoadMorePage<AdminLesson> | undefined>(
    { queryKey: adminLessonsQueryKeys.lessonsRoot },
    updater
  );
}

export function useAdminLessonCategoryListQuery(
  page: number,
  batchSize = ADMIN_LESSON_CATEGORY_BATCH_SIZE
) {
  return useFetch(
    adminLessonsQueryKeys.categories(page, batchSize),
    async () => {
      const response = await fetchAdminLessonCategories(buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminLessonListQuery(page: number, batchSize = ADMIN_LESSON_BATCH_SIZE) {
  return useFetch(
    adminLessonsQueryKeys.lessons(page, batchSize),
    async () => {
      const response = await fetchAdminLessons(buildAdminLoadMoreParams(page, batchSize));

      return toAdminLoadMorePage(response, page, batchSize);
    },
    { placeholderData: keepPreviousData }
  );
}

export function useAdminLessonCategoryMutations() {
  const queryClient = useQueryClient();

  const createCategory = useMutate(async (payload: AdminLessonCategoryFormValues) => {
    const response = await createAdminLessonCategory(payload);

    return {
      ...payload,
      id: response.id,
    };
  }, {
    onSuccess: (item) => {
      setCategoryCaches(queryClient, appendToAdminLoadMorePage(item));
    },
  });

  const updateCategory = useMutate(
    async ({
      categoryId,
      payload,
    }: {
      categoryId: number;
      payload: AdminLessonCategoryFormValues;
    }) => {
      await updateAdminLessonCategory(categoryId, payload);

      return {
        ...payload,
        id: categoryId,
      };
    },
    {
      onSuccess: (item) => {
        setCategoryCaches(queryClient, updateInAdminLoadMorePage(item));
      },
    }
  );

  const deleteCategory = useMutate(async (categoryId: number) => {
    await deleteAdminLessonCategory(categoryId);
    return categoryId;
  }, {
    onSuccess: (categoryId) => {
      setCategoryCaches(queryClient, removeFromAdminLoadMorePage(categoryId));
    },
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useAdminLessonMutations() {
  const queryClient = useQueryClient();

  const createLesson = useMutate(async (payload: AdminLessonFormValues) => {
    const response = await createAdminLesson(payload);

    return {
      ...payload,
      id: response.id,
    };
  }, {
    onSuccess: (item) => {
      setLessonCaches(queryClient, appendToAdminLoadMorePage(item));
    },
  });

  const updateLesson = useMutate(
    async ({ lessonId, payload }: { lessonId: number; payload: AdminLessonFormValues }) => {
      await updateAdminLesson(lessonId, payload);

      return {
        ...payload,
        id: lessonId,
      };
    },
    {
      onSuccess: (item) => {
        setLessonCaches(queryClient, updateInAdminLoadMorePage(item));
      },
    }
  );

  const deleteLesson = useMutate(async (lessonId: number) => {
    await deleteAdminLesson(lessonId);
    return lessonId;
  }, {
    onSuccess: (lessonId) => {
      setLessonCaches(queryClient, removeFromAdminLoadMorePage(lessonId));
    },
  });

  return {
    createLesson,
    updateLesson,
    deleteLesson,
  };
}
