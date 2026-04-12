import { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import EmptyContent from 'src/components/empty-content';
import { useSnackbar } from 'src/components/snackbar';
import { RHFTextField, RHFSwitch } from 'src/components/hook-form';
import { useBoolean } from 'src/hooks/use-boolean';
import { useUrlListState } from 'src/hooks/use-url-query-state';
import { useLocales } from 'src/locales';
import { AppsPageHeader } from 'src/pages/components/apps';
import { useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import {
  AdminDeleteDialog,
  AdminListCard,
  AdminLoadMoreFooter,
  AdminUpsertDialog,
} from 'src/sections/apps/admin/components';

import { createReadingTestSchema } from './components/schemas';
import {
  useAdminReadingListQuery,
  useAdminReadingTestMutations,
} from './api/use-reading-api';
import { READING_ADMIN_BATCH_SIZE } from './api/utils';
import type {
  AdminReadingListItem,
  AdminReadingTestFormValues,
} from './api/types';
import { AppsAdminReadingSkeleton } from './skeleton';

const defaultValues: AdminReadingTestFormValues = {
  title: '',
  description: '',
  timeLimit: 3600,
  isActive: true,
};

export default function AppsAdminReadingView() {
  const { tx } = useLocales();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const dialog = useBoolean();
  const deleteDialog = useBoolean();
  const [editingItem, setEditingItem] = useState<AdminReadingListItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AdminReadingListItem | null>(null);

  const listState = useUrlListState({
    defaultPageSize: READING_ADMIN_BATCH_SIZE,
    defaultOrdering: 'created_at',
  });

  const listQuery = useAdminReadingListQuery(listState.page, READING_ADMIN_BATCH_SIZE);
  const { createTest, updateTest, deleteTest } = useAdminReadingTestMutations();

  const methods = useForm<AdminReadingTestFormValues>({
    resolver: yupResolver(createReadingTestSchema(tx)),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!dialog.value) {
      return;
    }

    methods.reset(
      editingItem
        ? {
            title: editingItem.title,
            description: editingItem.description,
            timeLimit: editingItem.timeLimit,
            isActive: editingItem.isActive,
          }
        : defaultValues
    );
  }, [dialog.value, editingItem, methods]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    dialog.onTrue();
  };

  const handleOpenEdit = (item: AdminReadingListItem) => {
    setEditingItem(item);
    dialog.onTrue();
  };

  const handleSubmit = async (values: AdminReadingTestFormValues) => {
    if (editingItem) {
      await updateTest.mutateAsync({
        testId: editingItem.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await createTest.mutateAsync(values);
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    dialog.onFalse();
    setEditingItem(null);
  };

  const handleOpenDelete = (item: AdminReadingListItem) => {
    setItemToDelete(item);
    deleteDialog.onTrue();
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    await deleteTest.mutateAsync(itemToDelete.id);
    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    deleteDialog.onFalse();
    setItemToDelete(null);
  };

  const handleLoadMore = () => {
    listState.setPage(listState.page);
  };

  const showInitialSkeleton = listQuery.isPending && !listQuery.data;
  const loadMorePending = listQuery.isFetching && listQuery.isPlaceholderData;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.admin.reading.title')}
        description={tx('pages.admin.reading.description')}
        action={
          <Button variant="contained" onClick={handleOpenCreate}>
            {tx('pages.admin.shared.actions.create')}
          </Button>
        }
      />

      {showInitialSkeleton ? <AppsAdminReadingSkeleton /> : null}

      {!showInitialSkeleton && listQuery.data ? (
        <>
          {listQuery.data.items.length ? (
            <Grid container spacing={3}>
              {listQuery.data.items.map((item) => (
                <Grid key={item.id} item xs={12} md={6} xl={4}>
                  <AdminListCard
                    title={item.title}
                    description={item.description}
                    meta={[
                      {
                        label: tx('pages.admin.shared.time_limit'),
                        value: `${Math.ceil(item.timeLimit / 60)} ${tx('pages.admin.shared.minutes')}`,
                      },
                      {
                        label: tx('pages.admin.shared.active'),
                        value: item.isActive
                          ? tx('pages.admin.shared.boolean_yes')
                          : tx('pages.admin.shared.boolean_no'),
                      },
                    ]}
                    actions={
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => router.push(paths.ielts.admin.readingTest(String(item.id)))}
                        >
                          {tx('pages.admin.shared.actions.open')}
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => handleOpenEdit(item)}>
                          {tx('pages.admin.shared.actions.edit')}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleOpenDelete(item)}
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
              description={tx('pages.admin.reading.empty_description')}
            />
          )}

          {listQuery.data.hasNextPage ? (
            <AdminLoadMoreFooter
              count={listQuery.data.items.length}
              label={tx('pages.admin.shared.loaded_count')}
              buttonLabel={tx('pages.admin.shared.actions.load_more')}
              loading={loadMorePending}
              onClick={handleLoadMore}
            />
          ) : null}
        </>
      ) : null}

      <AdminUpsertDialog
        open={dialog.value}
        title={
          editingItem
            ? tx('pages.admin.reading.dialogs.edit_title')
            : tx('pages.admin.reading.dialogs.create_title')
        }
        submitLabel={
          editingItem
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={methods}
        loading={createTest.isPending || updateTest.isPending}
        onClose={() => {
          dialog.onFalse();
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="title"
            label={tx('pages.admin.shared.fields.title')}
          />
          <RHFTextField
            name="description"
            label={tx('pages.admin.shared.fields.description')}
            multiline
            rows={4}
          />
          <RHFTextField
            name="timeLimit"
            label={tx('pages.admin.shared.fields.time_limit_seconds')}
            type="number"
          />
          <RHFSwitch name="isActive" label={tx('pages.admin.shared.fields.is_active')} />
        </Stack>
      </AdminUpsertDialog>

      <AdminDeleteDialog
        open={deleteDialog.value}
        title={tx('pages.admin.reading.dialogs.delete_title')}
        description={tx('pages.admin.reading.dialogs.delete_description')}
        confirmLabel={tx('pages.admin.shared.actions.delete')}
        loading={deleteTest.isPending}
        onClose={() => {
          deleteDialog.onFalse();
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}
