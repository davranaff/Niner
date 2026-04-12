import { useEffect, useMemo, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';

import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import EmptyContent from 'src/components/empty-content';
import { RHFTextField, RHFSwitch } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { fDateTime } from 'src/utils/format-time';
import { useBoolean } from 'src/hooks/use-boolean';
import { useLocales } from 'src/locales';
import { AppsPageHeader } from 'src/pages/components/apps';
import { useParams, useRouter } from 'src/routes/hook';
import { paths } from 'src/routes/paths';
import {
  AdminDeleteDialog,
  AdminDetailSkeleton,
  AdminTreeCard,
  AdminUpsertDialog,
} from 'src/sections/apps/admin/components';
import { parseNumberParam, stringifyMultiLineValues } from 'src/sections/apps/admin/utils';

import { createWritingPartSchema, createWritingTestSchema } from '../components/schemas';
import {
  useAdminWritingDetailMutations,
  useAdminWritingDetailQuery,
  useAdminWritingTestMutations,
} from '../api/use-writing-api';
import type {
  AdminWritingPart,
  AdminWritingPartFormValues,
  AdminWritingTestFormValues,
} from '../api/types';

type DeleteTarget = { kind: 'test'; id: number } | { kind: 'part'; id: number } | null;

const defaultTestValues: AdminWritingTestFormValues = {
  title: '',
  description: '',
  timeLimit: 3600,
  isActive: true,
};

const defaultPartValues: AdminWritingPartFormValues = {
  order: 0,
  task: '',
  imageUrl: '',
  fileUrlsText: '',
};

export default function AppsAdminWritingDetailsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useParams();
  const testId = parseNumberParam(params.testId, 0);

  const detailQuery = useAdminWritingDetailQuery(testId);
  const writingTestMutations = useAdminWritingTestMutations();
  const writingMutations = useAdminWritingDetailMutations(testId);

  const testDialog = useBoolean();
  const partDialog = useBoolean();
  const deleteDialog = useBoolean();

  const [editingPart, setEditingPart] = useState<AdminWritingPart | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const detail = detailQuery.data;

  const testMethods = useForm<AdminWritingTestFormValues>({
    resolver: yupResolver(createWritingTestSchema(tx)),
    defaultValues: defaultTestValues,
    mode: 'onChange',
  });
  const partMethods = useForm<AdminWritingPartFormValues>({
    resolver: yupResolver(createWritingPartSchema(tx)),
    defaultValues: defaultPartValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (detail && testDialog.value) {
      testMethods.reset({
        title: detail.title,
        description: detail.description,
        timeLimit: detail.timeLimit,
        isActive: detail.isActive,
      });
    }
  }, [detail, testDialog.value, testMethods]);

  useEffect(() => {
    if (partDialog.value) {
      partMethods.reset(
        editingPart
          ? {
              order: editingPart.order,
              task: editingPart.task,
              imageUrl: editingPart.imageUrl ?? '',
              fileUrlsText: stringifyMultiLineValues(editingPart.fileUrls),
            }
          : defaultPartValues
      );
    }
  }, [editingPart, partDialog.value, partMethods]);

  const deleteDescription = useMemo(() => {
    if (!deleteTarget) {
      return '';
    }

    return tx(`pages.admin.writing.delete_help.${deleteTarget.kind}`);
  }, [deleteTarget, tx]);

  const handleUpdateTest = async (values: AdminWritingTestFormValues) => {
    if (!detail) {
      return;
    }

    await writingTestMutations.updateTest.mutateAsync({
      testId: detail.id,
      payload: values,
    });
    enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    testDialog.onFalse();
  };

  const handleUpsertPart = async (values: AdminWritingPartFormValues) => {
    if (editingPart) {
      await writingMutations.updatePart.mutateAsync({
        partId: editingPart.id,
        payload: values,
      });
      enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    } else {
      await writingMutations.createPart.mutateAsync({ payload: values });
      enqueueSnackbar(tx('pages.admin.shared.messages.created'), { variant: 'success' });
    }

    partDialog.onFalse();
    setEditingPart(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !detail) {
      return;
    }

    if (deleteTarget.kind === 'test') {
      await writingTestMutations.deleteTest.mutateAsync(detail.id);
      enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
      deleteDialog.onFalse();
      router.replace(paths.ielts.admin.writing);
      return;
    }

    await writingMutations.deletePart.mutateAsync(deleteTarget.id);
    enqueueSnackbar(tx('pages.admin.shared.messages.deleted'), { variant: 'success' });
    deleteDialog.onFalse();
    setDeleteTarget(null);
  };

  if (!testId) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.admin.shared.empty_title')}
          description={tx('pages.admin.writing.invalid_test')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={detail?.title ?? tx('pages.admin.writing.detail_title')}
        description={tx('pages.admin.writing.detail_description')}
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => router.push(paths.ielts.admin.writing)}>
              {tx('pages.admin.shared.actions.back')}
            </Button>
            <Button variant="contained" onClick={testDialog.onTrue} disabled={!detail}>
              {tx('pages.admin.shared.actions.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setDeleteTarget({ kind: 'test', id: testId });
                deleteDialog.onTrue();
              }}
              disabled={!detail}
            >
              {tx('pages.admin.shared.actions.delete')}
            </Button>
          </Stack>
        }
      />

      {detailQuery.isPending && !detail ? <AdminDetailSkeleton /> : null}

      {detail ? (
        <Stack spacing={3}>
          <AdminTreeCard
            title={detail.title}
            subtitle={`${tx('pages.admin.shared.created_at')}: ${fDateTime(detail.createdAt)}`}
            actions={
              <Button
                variant="contained"
                onClick={() => {
                  setEditingPart(null);
                  partDialog.onTrue();
                }}
              >
                {tx('pages.admin.writing.actions.add_part')}
              </Button>
            }
          >
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {detail.description}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`${tx('pages.admin.shared.time_limit')}: ${detail.timeLimit}s`} />
                <Chip size="small" label={`${tx('pages.admin.writing.summary.parts')}: ${detail.parts.length}`} />
              </Stack>
            </Stack>
          </AdminTreeCard>

          {detail.parts.length ? (
            detail.parts.map((part) => (
              <AdminTreeCard
                key={part.id}
                title={`${tx('pages.admin.writing.labels.part')} ${part.order}`}
                subtitle={tx('pages.admin.writing.summary.task_prompt')}
                actions={
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditingPart(part);
                        partDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.edit')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setDeleteTarget({ kind: 'part', id: part.id });
                        deleteDialog.onTrue();
                      }}
                    >
                      {tx('pages.admin.shared.actions.delete')}
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                    {part.task}
                  </Typography>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {tx('pages.admin.writing.fields.image_url')}
                    </Typography>
                    <Typography variant="body2">
                      {part.imageUrl ? (
                        <Link href={part.imageUrl} target="_blank" rel="noreferrer">
                          {part.imageUrl}
                        </Link>
                      ) : (
                        tx('pages.admin.shared.not_set')
                      )}
                    </Typography>
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {tx('pages.admin.writing.fields.file_urls')}
                    </Typography>

                    {part.fileUrls.length ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {part.fileUrls.map((item) => (
                          <Chip key={item} size="small" label={item} />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2">{tx('pages.admin.shared.not_set')}</Typography>
                    )}
                  </Stack>
                </Stack>
              </AdminTreeCard>
            ))
          ) : (
            <EmptyContent
              filled
              title={tx('pages.admin.shared.empty_title')}
              description={tx('pages.admin.writing.empty_parts')}
            />
          )}
        </Stack>
      ) : null}

      <AdminUpsertDialog
        open={testDialog.value}
        title={tx('pages.admin.writing.dialogs.edit_title')}
        submitLabel={tx('pages.admin.shared.actions.save')}
        methods={testMethods}
        loading={writingTestMutations.updateTest.isPending}
        onClose={testDialog.onFalse}
        onSubmit={handleUpdateTest}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField name="title" label={tx('pages.admin.shared.fields.title')} />
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

      <AdminUpsertDialog
        open={partDialog.value}
        title={
          editingPart
            ? tx('pages.admin.writing.dialogs.edit_part_title')
            : tx('pages.admin.writing.dialogs.create_part_title')
        }
        submitLabel={
          editingPart
            ? tx('pages.admin.shared.actions.save')
            : tx('pages.admin.shared.actions.create')
        }
        methods={partMethods}
        loading={writingMutations.createPart.isPending || writingMutations.updatePart.isPending}
        onClose={() => {
          partDialog.onFalse();
          setEditingPart(null);
        }}
        onSubmit={handleUpsertPart}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="order"
            label={tx('pages.admin.writing.fields.order')}
            type="number"
          />
          <RHFTextField
            name="task"
            label={tx('pages.admin.writing.fields.task')}
            multiline
            rows={6}
          />
          <RHFTextField
            name="imageUrl"
            label={tx('pages.admin.writing.fields.image_url')}
          />
          <RHFTextField
            name="fileUrlsText"
            label={tx('pages.admin.writing.fields.file_urls')}
            multiline
            rows={4}
          />
        </Stack>
      </AdminUpsertDialog>

      <AdminDeleteDialog
        open={deleteDialog.value}
        title={tx('pages.admin.writing.dialogs.delete_title')}
        description={deleteDescription}
        confirmLabel={tx('pages.admin.shared.actions.delete')}
        loading={writingTestMutations.deleteTest.isPending || writingMutations.deletePart.isPending}
        onClose={() => {
          deleteDialog.onFalse();
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
}
