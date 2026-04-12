import { request } from 'src/utils/axios';

import type {
  AdminDeleteResponse,
  AdminMutationResponse,
  AdminOffsetPage,
} from 'src/sections/apps/admin/types';

import type {
  AdminLesson,
  AdminLessonCategory,
  AdminLessonCategoryFormValues,
  AdminLessonFormValues,
} from './types';

const adminLessonsUrls = {
  categories: '/api/v1/admin/lessons/categories',
  patchCategory: (categoryId: number) => `/api/v1/admin/lessons/categories/${categoryId}`,
  deleteCategory: (categoryId: number) => `/api/v1/admin/lessons/categories/${categoryId}`,
  lessons: '/api/v1/admin/lessons',
  patchLesson: (lessonId: number) => `/api/v1/admin/lessons/${lessonId}`,
  deleteLesson: (lessonId: number) => `/api/v1/admin/lessons/${lessonId}`,
} as const;

export function fetchAdminLessonCategories(params: { offset: number; limit: number }) {
  return request<AdminOffsetPage<AdminLessonCategory>>({
    method: 'GET',
    url: adminLessonsUrls.categories,
    params,
  });
}

export function createAdminLessonCategory(payload: AdminLessonCategoryFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminLessonsUrls.categories,
    data: payload,
  });
}

export function updateAdminLessonCategory(
  categoryId: number,
  payload: AdminLessonCategoryFormValues
) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminLessonsUrls.patchCategory(categoryId),
    data: payload,
  });
}

export function deleteAdminLessonCategory(categoryId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminLessonsUrls.deleteCategory(categoryId),
  });
}

export function fetchAdminLessons(params: { offset: number; limit: number }) {
  return request<AdminOffsetPage<AdminLesson>>({
    method: 'GET',
    url: adminLessonsUrls.lessons,
    params,
  });
}

export function createAdminLesson(payload: AdminLessonFormValues) {
  return request<AdminMutationResponse>({
    method: 'POST',
    url: adminLessonsUrls.lessons,
    data: payload,
  });
}

export function updateAdminLesson(lessonId: number, payload: AdminLessonFormValues) {
  return request<AdminMutationResponse>({
    method: 'PATCH',
    url: adminLessonsUrls.patchLesson(lessonId),
    data: payload,
  });
}

export function deleteAdminLesson(lessonId: number) {
  return request<AdminDeleteResponse>({
    method: 'DELETE',
    url: adminLessonsUrls.deleteLesson(lessonId),
  });
}
