import { useEffect, useMemo, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import EmptyContent from 'src/components/empty-content';
import { RHFSelect, RHFTextField } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { useBoolean } from 'src/hooks/use-boolean';
import { useUrlListState } from 'src/hooks/use-url-query-state';

import { useLocales } from 'src/locales';
import { AppsPageHeader } from 'src/pages/components/apps';
import {
  AdminDeleteDialog,
  AdminListCard,
  AdminLoadMoreFooter,
  AdminManualNote,
  AdminUpsertDialog,
} from 'src/sections/apps/admin/components';

import { createLessonCategorySchema, createLessonSchema } from './components/schemas';
import {
  useAdminLessonCategoryListQuery,
  useAdminLessonCategoryMutations,
  useAdminLessonListQuery,
  useAdminLessonMutations,
} from './api/use-lessons-api';
import {
  ADMIN_LESSON_BATCH_SIZE,
  ADMIN_LESSON_CATEGORY_BATCH_SIZE,
} from './api/utils';
import type {
  AdminLesson,
  AdminLessonCategory,
  AdminLessonCategoryFormValues,
  AdminLessonFormValues,
} from './api/types';
import { AppsAdminLessonsSkeleton } from './skeleton';

type DeleteTarget =
  | { kind: 'category'; item: AdminLessonCategory }
  | { kind: 'lesson'; item: AdminLesson }
  | null;

const defaultCategoryValues: AdminLessonCategoryFormValues = {
  title: '',
  slug: '',
};

const defaultLessonValues: AdminLessonFormValues = {
  categoryId: 0,
  title: '',
  videoLink: '',
};

export default function AppsAdminLessonsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();

  const categoryDialog = useBoolean();
  const lessonDialog = useBoolean();
  const deleteDialog = useBoolean();

  const [editingCategory, setEditingCategory] = useState<AdminLessonCategory | null>(null);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const categoriesState = useUrlListState({
    pageKey: 'categories_page',
    pageSizeKey: 'categories_page_size',
    searchKey: 'categories_search',
    orderingKey: 'categories_ordering',
    defaultPageSize: ADMIN_LESSON_CATEGORY_BATCH_SIZE,
    defaultOrdering: 'created_at',
  });

  const lessonsState = useUrlListState({
    pageKey: 'lessons_page',
    pageSizeKey: 'lessons_page_size',
    searchKey: 'lessons_search',
    orderingKey: 'lessons_ordering',
    defaultPageSize: ADMIN_LESSON_BATCH_SIZE,
    defaultOrdering: 'created_at',
  });

  const categoriesQuery = useAdminLessonCategoryListQuery(
    categoriesState.page,
    ADMIN_LESSON_CATEGORY_BATCH_SIZE
  );
  const lessonsQuery = useAdminLessonListQuery(lessonsState.page, ADMIN_LESSON_BATCH_SIZE);

  const categoryMutations = useAdminLessonCategoryMutations();
  const lessonMutations = useAdminLessonMutations();

  const categoryMethods = useForm<AdminLessonCategoryFormValues>({
    resolver: yupResolver(createLessonCategorySchema(tx)),
    defaultValues: defaultCategoryValues,
    mode: 'onChange',
  });
  const lessonMethods = useForm<AdminLessonFormValues>({
    resolver: yupResolver(createLessonSchema(tx)),
    defaultValues: defaultLessonValues,
    mode: 'onChange',
  });

  const categoryItems = useMemo(
    () => categoriesQuery.data?.items ?? [],
    [categoriesQuery.data?.items]
  );
  const lessonItems = useMemo(
    () => lessonsQuery.data?.items ?? [],
    [lessonsQuery.data?.items]
  );

  const categoryLabelById = useMemo(
    () => new Map(categoryItems.map((item) => [item.id, item.title])),
    [categoryItems]
  );

  useEffect(() => {
    if (!categoryDialog.value) {
      return;
    }

    categoryMethods.reset(
      editingCategory
        ? {
            title: editingCategory.title,
            slug: editingCategory.slug,
          }
        : defaultCategoryValues
    );
  }, [categoryDialog.value, categoryMethods, editingCategory]);

  useEffect(() => {
    if (!lessonDialog.value) {
      return;
    }

    lessonMethods.reset(
      editingLesson
        ? {
            categoryId: editingLesson.categoryId,
            title: editingLesson.title,
            videoLink: editingLesson.videoLink,
          }
        : {
            ...defaultLessonValues,
            categoryId: categoryItems[0]?.id ?? 0,
          }
    );
  }, [categoryItems, editingLesson, lessonDialog.value, lessonMethods]);

  const showInitialSkeleton =
    (categoriesQuery.isPending && !categoriesQuery.data) ||
    (lessonsQuery.isPending && !lessonsQuery.data);

  const categoryLoadMorePending =
    categoriesQuery.isFetching && categoriesQuery.isPlaceholderData;
  const lessonLoadMorePending = lessonsQuery.isFetching && lessonsQuery.isPlaceholderData;

  const handleSubmitCategory = async (values: AdminLessonCategoryFormValues) => {
    if (editingCategory) {
      await categoryMutations.updateCategory.mutateAsync({
        categoryId: editingCategory.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await categoryMutations.createCategory.mutateAsync(values);
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    categoryDialog.onFalse();
    setEditingCategory(null);
  };

  const handleSubmitLesson = async (values: AdminLessonFormValues) => {
    if (editingLesson) {
      await lessonMutations.updateLesson.mutateAsync({
        lessonId: editingLesson.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await lessonMutations.createLesson.mutateAsync(values);
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    lessonDialog.onFalse();
    setEditingLesson(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.kind === 'category') {
      await categoryMutations.deleteCategory.mutateAsync(deleteTarget.item.id);
    } else {
      await lessonMutations.deleteLesson.mutateAsync(deleteTarget.item.id);
    }

    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    deleteDialog.onFalse();
    setDeleteTarget(null);
  };

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.admin.lessons.title')}
        description={tx('pages.admin.lessons.description')}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => {
                setEditingCategory(null);
                categoryDialog.onTrue();
              }}
            >
              {tx('pages.admin.lessons.actions.add_category')}
            </Button>
            <Button
              variant="contained"
              disabled={!categoryItems.length}
              onClick={() => {
                setEditingLesson(null);
                lessonDialog.onTrue();
              }}
            >
              {tx('pages.admin.lessons.actions.add_lesson')}
            </Button>
          </Stack>
        }
      />

      {!showInitialSkeleton && !categoryItems.length ? (
        <AdminManualNote>{tx('pages.admin.lessons.category_required_note')}</AdminManualNote>
      ) : null}

      {showInitialSkeleton ? <AppsAdminLessonsSkeleton /> : null}

      {!showInitialSkeleton ? (
        <Stack spacing={4}>
          <Stack spacing={2}>
            <Typography variant="h6">{tx('pages.admin.lessons.sections.categories')}</Typography>

            {categoryItems.length ? (
              <Grid container spacing={3}>
                {categoryItems.map((item) => (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <AdminListCard
                      title={item.title}
                      description={item.slug}
                      actions={
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingCategory(item);
                              categoryDialog.onTrue();
                            }}
                          >
                            {tx('pages.admin.shared.actions.edit')}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteTarget({ kind: 'category', item });
                              deleteDialog.onTrue();
                            }}
                          >
                            {tx('pages.admin.shared.actions.delete')}
                          </Button>
                        </Stack>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyContent
                filled
                title={tx('pages.admin.shared.empty_title')}
                description={tx('pages.admin.lessons.empty_categories')}
              />
            )}

            {categoriesQuery.data?.hasNextPage ? (
              <AdminLoadMoreFooter
                count={categoryItems.length}
                label={tx('pages.admin.shared.loaded_count')}
                buttonLabel={tx('pages.admin.shared.actions.load_more')}
                loading={categoryLoadMorePending}
                onClick={() => categoriesState.setPage(categoriesState.page)}
              />
            ) : null}
          </Stack>

          <Stack spacing={2}>
            <Typography variant="h6">{tx('pages.admin.lessons.sections.lessons')}</Typography>

            {lessonItems.length ? (
              <Grid container spacing={3}>
                {lessonItems.map((item) => (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <AdminListCard
                      title={item.title}
                      description={`${tx('pages.admin.lessons.fields.category')}: ${
                        categoryLabelById.get(item.categoryId) ?? `#${item.categoryId}`
                      }`}
                      meta={[
                        {
                          label: tx('pages.admin.lessons.fields.video_link'),
                          value: item.videoLink,
                        },
                      ]}
                      actions={
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingLesson(item);
                              lessonDialog.onTrue();
                            }}
                          >
                            {tx('pages.admin.shared.actions.edit')}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteTarget({ kind: 'lesson', item });
                              deleteDialog.onTrue();
                            }}
                          >
                            {tx('pages.admin.shared.actions.delete')}
                          </Button>
                        </Stack>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyContent
                filled
                title={tx('pages.admin.shared.empty_title')}
                description={tx('pages.admin.lessons.empty_lessons')}
              />
            )}

            {lessonsQuery.data?.hasNextPage ? (
              <AdminLoadMoreFooter
                count={lessonItems.length}
                label={tx('pages.admin.shared.loaded_count')}
                buttonLabel={tx('pages.admin.shared.actions.load_more')}
                loading={lessonLoadMorePending}
                onClick={() => lessonsState.setPage(lessonsState.page)}
              />
            ) : null}
          </Stack>
        </Stack>
      ) : null}

      <AdminUpsertDialog
        open={categoryDialog.value}
        title={
          editingCategory
            ? tx('pages.admin.lessons.dialogs.edit_category_title')
            : tx('pages.admin.lessons.dialogs.create_category_title')
        }
        submitLabel={
          editingCategory
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={categoryMethods}
        loading={
          categoryMutations.createCategory.isPending ||
          categoryMutations.updateCategory.isPending
        }
        onClose={() => {
          categoryDialog.onFalse();
          setEditingCategory(null);
        }}
        onSubmit={handleSubmitCategory}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField name="slug" label={tx('pages.admin.lessons.fields.slug')} />
        </Stack>
      </AdminUpsertDialog>

      <AdminUpsertDialog
        open={lessonDialog.value}
        title={
          editingLesson
            ? tx('pages.admin.lessons.dialogs.edit_lesson_title')
            : tx('pages.admin.lessons.dialogs.create_lesson_title')
        }
        submitLabel={
          editingLesson
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={lessonMethods}
        loading={lessonMutations.createLesson.isPending || lessonMutations.updateLesson.isPending}
        onClose={() => {
          lessonDialog.onFalse();
          setEditingLesson(null);
        }}
        onSubmit={handleSubmitLesson}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFSelect name="categoryId" label={tx('pages.admin.lessons.fields.category')}>
            {categoryItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.title}
              </MenuItem>
            ))}
          </RHFSelect>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
          <RHFTextField
            name="videoLink"
            label={tx('pages.admin.lessons.fields.video_link')}
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminDeleteDialog
        open={deleteDialog.value}
        title={tx('pages.admin.lessons.dialogs.delete_title')}
        description={
          deleteTarget?.kind === 'category'
            ? tx('pages.admin.lessons.dialogs.delete_category_description')
            : tx('pages.admin.lessons.dialogs.delete_lesson_description')
        }
        confirmLabel={tx('pages.admin.shared.actions.delete')}
        loading={
          categoryMutations.deleteCategory.isPending || lessonMutations.deleteLesson.isPending
        }
        onClose={() => {
          deleteDialog.onFalse();
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}
