import { useEffect, useMemo, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import EmptyContent from 'src/components/empty-content';
import { RHFTextField, RHFSwitch } from 'src/components/hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { useBoolean } from 'src/hooks/use-boolean';
import { stringFilterParam, useUrlListState } from 'src/hooks/use-url-query-state';

import { useLocales } from 'src/locales';
import { AppsPageHeader } from 'src/pages/components/apps';
import { MetricCard } from 'src/pages/components/apps/metric-card';
import {
  AdminDetailSkeleton,
  AdminListCard,
  AdminLoadMoreFooter,
  AdminManualNote,
  AdminUpsertDialog,
} from 'src/sections/apps/admin/components';
import { fDateTime } from 'src/utils/format-time';

import { createWritingReviewSchema } from './components/schemas';
import {
  useAdminExamDetailQuery,
  useAdminExamsListQuery,
  useAdminWritingReviewMutation,
} from './api/use-exams-api';
import {
  ADMIN_EXAM_BATCH_SIZE,
  resolveAdminExamStatus,
  type AdminExamStatus,
  toAdminWritingReviewPayload,
} from './api/utils';
import type {
  AdminExamKind,
  AdminWritingReviewFormValues,
} from './api/types';
import { AppsAdminExamsSkeleton } from './skeleton';

const examKinds: AdminExamKind[] = ['reading', 'listening', 'writing'];

const defaultReviewValues: AdminWritingReviewFormValues = {
  examPartId: '',
  isChecked: true,
  corrections: '',
  score: '',
};

function statusColor(
  status: AdminExamStatus
): 'info' | 'success' | 'warning' {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'terminated') {
    return 'warning';
  }

  return 'info';
}

function translateFinishReason(
  finishReason: string | null,
  tx: (key: string) => string
) {
  if (!finishReason) {
    return tx('pages.admin.shared.not_set');
  }

  const key = `pages.admin.exams.finish_reason.${finishReason}`;
  const translated = tx(key);

  return translated === key ? finishReason : translated;
}

function translateStatus(status: AdminExamStatus, tx: (key: string) => string) {
  return tx(`pages.admin.exams.status.${status}`);
}

export default function AppsAdminExamsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();

  const reviewDialog = useBoolean();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  const listState = useUrlListState({
    defaultPageSize: ADMIN_EXAM_BATCH_SIZE,
    defaultOrdering: 'created_at',
    extraSchema: {
      kind: stringFilterParam('writing'),
    },
  });

  const kind = (listState.values.kind as AdminExamKind | undefined) ?? 'writing';
  const listQuery = useAdminExamsListQuery(kind, listState.page, ADMIN_EXAM_BATCH_SIZE);
  const detailQuery = useAdminExamDetailQuery(kind, selectedExamId ?? 0);
  const reviewMutation = useAdminWritingReviewMutation();

  const reviewMethods = useForm<AdminWritingReviewFormValues>({
    resolver: yupResolver(createWritingReviewSchema(tx)),
    defaultValues: defaultReviewValues,
    mode: 'onChange',
  });

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

  useEffect(() => {
    if (!reviewDialog.value) {
      return;
    }

    reviewMethods.reset(defaultReviewValues);
  }, [reviewDialog.value, reviewMethods]);

  useEffect(() => {
    if (!items.length) {
      setSelectedExamId(null);
      return;
    }

    if (!selectedExamId || !items.some((item) => item.id === selectedExamId)) {
      setSelectedExamId(items[0].id);
    }
  }, [items, selectedExamId]);

  const metrics = useMemo(() => {
    const next = {
      inProgress: 0,
      completed: 0,
      terminated: 0,
    };

    items.forEach((item) => {
      const status = resolveAdminExamStatus(item);

      if (status === 'completed') {
        next.completed += 1;
      } else if (status === 'terminated') {
        next.terminated += 1;
      } else {
        next.inProgress += 1;
      }
    });

    return next;
  }, [items]);

  const showInitialSkeleton = listQuery.isPending && !listQuery.data;
  const loadMorePending = listQuery.isFetching && listQuery.isPlaceholderData;

  const handleKindChange = (nextKind: AdminExamKind) => {
    if (nextKind === kind) {
      return;
    }

    setSelectedExamId(null);
    listState.setValues({ kind: nextKind, page: 1 });
  };

  const handleSubmitReview = async (values: AdminWritingReviewFormValues) => {
    await reviewMutation.mutateAsync({
      examPartId: Number(values.examPartId),
      payload: toAdminWritingReviewPayload(values),
    });

    enqueueSnackbar(tx('pages.admin.shared.messages.updated'), { variant: 'success' });
    reviewDialog.onFalse();
  };

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.admin.exams.title')}
        description={tx('pages.admin.exams.description')}
        action={
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5}>
            <Stack direction="row" spacing={1}>
              {examKinds.map((item) => (
                <Button
                  key={item}
                  variant={item === kind ? 'contained' : 'outlined'}
                  onClick={() => handleKindChange(item)}
                >
                  {tx(`pages.admin.exams.kinds.${item}`)}
                </Button>
              ))}
            </Stack>

            {kind === 'writing' ? (
              <Button variant="contained" color="warning" onClick={reviewDialog.onTrue}>
                {tx('pages.admin.exams.actions.review_writing_part')}
              </Button>
            ) : null}
          </Stack>
        }
      />

      {kind === 'writing' ? (
        <AdminManualNote>{tx('pages.admin.exams.review_note')}</AdminManualNote>
      ) : null}

      {showInitialSkeleton ? <AppsAdminExamsSkeleton /> : null}

      {!showInitialSkeleton && listQuery.data ? (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <MetricCard
                label={tx('pages.admin.exams.metrics.loaded')}
                value={String(items.length)}
                icon="solar:clipboard-list-bold-duotone"
                color="primary"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard
                label={tx('pages.admin.exams.metrics.in_progress')}
                value={String(metrics.inProgress)}
                icon="solar:clock-circle-bold-duotone"
                color="info"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard
                label={tx('pages.admin.exams.metrics.completed')}
                value={String(metrics.completed)}
                icon="solar:check-circle-bold-duotone"
                color="success"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetricCard
                label={tx('pages.admin.exams.metrics.terminated')}
                value={String(metrics.terminated)}
                icon="solar:danger-triangle-bold-duotone"
                color="warning"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Stack spacing={2}>
                {items.length ? (
                  items.map((item) => {
                    const status = resolveAdminExamStatus(item);

                    return (
                      <AdminListCard
                        key={item.id}
                        title={`${tx(`pages.admin.exams.kinds.${item.kind}`)} #${item.id}`}
                        description={`${tx('pages.admin.exams.fields.user_id')}: ${item.userId}`}
                        meta={[
                          {
                            label: tx('pages.admin.exams.fields.test_id'),
                            value: String(item.testId),
                          },
                          {
                            label: tx('pages.admin.exams.fields.started_at'),
                            value: item.startedAt
                              ? fDateTime(item.startedAt)
                              : tx('pages.admin.shared.not_set'),
                          },
                          {
                            label: tx('pages.admin.exams.fields.finished_at'),
                            value: item.finishedAt
                              ? fDateTime(item.finishedAt)
                              : tx('pages.admin.shared.not_set'),
                          },
                          {
                            label: tx('pages.admin.exams.fields.finish_reason'),
                            value: translateFinishReason(item.finishReason, tx),
                          },
                        ]}
                        actions={
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            justifyContent="space-between"
                          >
                            <Chip
                              color={statusColor(status)}
                              variant="soft"
                              label={translateStatus(status, tx)}
                            />
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant={item.id === selectedExamId ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => setSelectedExamId(item.id)}
                              >
                                {tx('pages.admin.shared.actions.open')}
                              </Button>
                              {kind === 'writing' ? (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="warning"
                                  onClick={reviewDialog.onTrue}
                                >
                                  {tx('pages.admin.exams.actions.review')}
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                        }
                      />
                    );
                  })
                ) : (
                  <EmptyContent
                    filled
                    title={tx('pages.admin.shared.empty_title')}
                    description={tx('pages.admin.exams.empty_description')}
                  />
                )}

                {listQuery.data.hasNextPage ? (
                  <AdminLoadMoreFooter
                    count={items.length}
                    label={tx('pages.admin.shared.loaded_count')}
                    buttonLabel={tx('pages.admin.shared.actions.load_more')}
                    loading={loadMorePending}
                    onClick={() => listState.setPage(listState.page)}
                  />
                ) : null}
              </Stack>
            </Grid>

            <Grid item xs={12} lg={5}>
              {selectedExamId && detailQuery.isPending ? <AdminDetailSkeleton /> : null}

              {!detailQuery.isPending && detailQuery.data ? (
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Typography variant="h6">
                        {tx('pages.admin.exams.detail_title')}
                      </Typography>
                      <Chip
                        color={statusColor(resolveAdminExamStatus(detailQuery.data))}
                        variant="soft"
                        label={translateStatus(resolveAdminExamStatus(detailQuery.data), tx)}
                      />
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {tx('pages.admin.exams.detail_description')}
                    </Typography>

                    <Divider />

                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.exam_id')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {detailQuery.data.id}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.user_id')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {detailQuery.data.userId}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.test_id')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {detailQuery.data.testId}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.started_at')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {detailQuery.data.startedAt
                            ? fDateTime(detailQuery.data.startedAt)
                            : tx('pages.admin.shared.not_set')}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.finished_at')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {detailQuery.data.finishedAt
                            ? fDateTime(detailQuery.data.finishedAt)
                            : tx('pages.admin.shared.not_set')}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.admin.exams.fields.finish_reason')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {translateFinishReason(detailQuery.data.finishReason, tx)}
                        </Typography>
                      </Stack>
                    </Stack>

                    {kind === 'writing' ? (
                      <>
                        <Divider />
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                            {tx('pages.admin.exams.review_title')}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {tx('pages.admin.exams.review_description')}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={reviewDialog.onTrue}
                        >
                          {tx('pages.admin.exams.actions.review_writing_part')}
                        </Button>
                      </>
                    ) : null}
                  </Stack>
                </Card>
              ) : null}
            </Grid>
          </Grid>
        </Stack>
      ) : null}

      <AdminUpsertDialog
        open={reviewDialog.value}
        title={tx('pages.admin.exams.dialogs.review_title')}
        submitLabel={tx('pages.admin.shared.actions.save')}
        methods={reviewMethods}
        loading={reviewMutation.isPending}
        onClose={reviewDialog.onFalse}
        onSubmit={handleSubmitReview}
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RHFTextField
            name="examPartId"
            label={tx('pages.admin.exams.fields.exam_part_id')}
          />
          <RHFTextField name="score" label={tx('pages.admin.exams.fields.score')} />
          <RHFTextField
            name="corrections"
            label={tx('pages.admin.exams.fields.corrections')}
            multiline
            rows={5}
          />
          <RHFSwitch
            name="isChecked"
            label={tx('pages.admin.exams.fields.is_checked')}
          />
        </Stack>
      </AdminUpsertDialog>
    </Container>
  );
}
