import { useEffect, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import LoadingButton from '@mui/lab/LoadingButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import EmptyContent from 'src/components/empty-content';
import { useSnackbar } from 'src/components/snackbar';
import { useLocales } from 'src/locales';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
import { getModulePath, getModuleTestPath } from 'src/sections/apps/common/module-test/utils/module-meta';
import { fDateTime } from 'src/utils/format-time';
import {
  stringFilterParam,
  stringParam,
  useUrlListState,
} from 'src/hooks/use-url-query-state';

import {
  assignmentQueryKeys,
  useAssignmentDetailsQuery,
  useAssignmentsQuery,
  useGenerateAssignmentTestMutation,
  useSubmitAssignmentAttemptMutation,
} from './api/use-assignments-api';
import type {
  AssignmentDetailsResponse,
  AssignmentItem,
  AssignmentModule,
  AssignmentStatus,
} from './api/types';

const assignmentExtraSchema = Object.freeze({
  module: stringFilterParam('all'),
  status: stringFilterParam('all'),
  exam: stringParam(''),
  assignment: stringParam(''),
});

type AssignmentFilters = {
  examId: number | null;
  search: string;
};

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveAssignmentStatusColor(status: AssignmentStatus): 'default' | 'warning' | 'info' | 'success' {
  if (status === 'completed') {
    return 'success';
  }
  if (status === 'in_progress') {
    return 'info';
  }
  if (status === 'recommended') {
    return 'warning';
  }
  return 'default';
}

function translateAssignmentStatus(
  status: AssignmentStatus,
  translate: (key: string, options?: Record<string, string | number>) => string
) {
  if (status === 'completed') {
    return translate('pages.ielts.shared.status_completed');
  }
  if (status === 'in_progress') {
    return translate('pages.ielts.shared.status_in_progress');
  }
  if (status === 'recommended') {
    return translate('pages.ielts.assignments.status_recommended');
  }
  return translate('pages.ielts.assignments.status_cancelled');
}

function buildFilteredAssignments(items: AssignmentItem[], filters: AssignmentFilters) {
  const { examId, search } = filters;
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (examId !== null && item.sourceExamId !== examId) {
      return false;
    }

    if (!normalizedSearch.length) {
      return true;
    }

    const haystack = [
      item.title,
      item.instructions,
      item.skillGap?.label ?? '',
      item.taskType,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

function assignmentProgressValue(details: AssignmentDetailsResponse | null) {
  const severity = details?.skillGap?.severityScore;
  if (typeof severity !== 'number') {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(severity * 100)));
}

function sourceAttemptLabel(item: AssignmentItem, tx: (key: string, options?: Record<string, string | number>) => string) {
  return tx('pages.ielts.assignments.source_attempt_value', {
    module: tx(`pages.ielts.${item.sourceExamKind}.title`),
    id: item.sourceExamId,
  });
}

function translateGenerationStatus(
  status: AssignmentItem['generatedTest']['status'],
  translate: (key: string, options?: Record<string, string | number>) => string
) {
  if (status === 'queued') {
    return translate('pages.ielts.assignments.generation_status_queued');
  }
  if (status === 'processing') {
    return translate('pages.ielts.assignments.generation_status_processing');
  }
  if (status === 'ready') {
    return translate('pages.ielts.assignments.generation_status_ready');
  }
  if (status === 'failed') {
    return translate('pages.ielts.assignments.generation_status_failed');
  }
  return translate('pages.ielts.assignments.generation_status_idle');
}

function buildGeneratedTestHref(module: AssignmentModule, testId: number) {
  return getModuleTestPath(module, String(testId));
}

export default function AppsAssignmentsView() {
  const { tx } = useLocales();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const listState = useUrlListState({
    defaultPageSize: 12,
    defaultOrdering: 'recommended',
    extraSchema: assignmentExtraSchema,
  });
  const { page, rowsPerPage, search, setSearch, values, setValues } = listState;

  const moduleFilter = values.module as string;
  const statusFilter = values.status as string;
  const examId = parsePositiveInt(values.exam as string);
  const selectedAssignmentId = parsePositiveInt(values.assignment as string);

  const assignmentsQuery = useAssignmentsQuery({
    limit: 100,
    offset: 0,
    module: moduleFilter !== 'all' ? (moduleFilter as AssignmentModule) : undefined,
    status: statusFilter !== 'all' ? (statusFilter as AssignmentStatus) : undefined,
  });

  const filteredAssignments = useMemo(
    () =>
      buildFilteredAssignments(assignmentsQuery.data?.items ?? [], {
        examId,
        search,
      }),
    [assignmentsQuery.data?.items, examId, search]
  );

  const pagedAssignments = useMemo(() => {
    const start = Math.max(0, page - 1) * rowsPerPage;
    return filteredAssignments.slice(start, start + rowsPerPage);
  }, [filteredAssignments, page, rowsPerPage]);

  const selectedAssignment =
    filteredAssignments.find((item) => item.id === selectedAssignmentId) ?? filteredAssignments[0] ?? null;

  const detailsQuery = useAssignmentDetailsQuery(selectedAssignment?.id ?? 0, Boolean(selectedAssignment));
  const submitMutation = useSubmitAssignmentAttemptMutation();
  const generateTestMutation = useGenerateAssignmentTestMutation();
  const [responseText, setResponseText] = useState('');
  const [seededAssignmentId, setSeededAssignmentId] = useState<number | null>(null);

  useEffect(() => {
    if (!filteredAssignments.length) {
      if (values.assignment) {
        setValues({ assignment: '' });
      }
      return;
    }

    if (!selectedAssignmentId || !filteredAssignments.some((item) => item.id === selectedAssignmentId)) {
      setValues({ assignment: String(filteredAssignments[0].id) });
    }
  }, [filteredAssignments, selectedAssignmentId, setValues, values.assignment]);

  useEffect(() => {
    if (!selectedAssignment || !detailsQuery.data) {
      return;
    }

    if (seededAssignmentId === selectedAssignment.id) {
      return;
    }

    setResponseText(detailsQuery.data.attempts[0]?.responseText ?? '');
    setSeededAssignmentId(selectedAssignment.id);
  }, [detailsQuery.data, seededAssignmentId, selectedAssignment]);

  const counts = useMemo(
    () =>
      filteredAssignments.reduce(
        (accumulator, item) => ({
          total: accumulator.total + 1,
          recommended: accumulator.recommended + (item.status === 'recommended' ? 1 : 0),
          inProgress: accumulator.inProgress + (item.status === 'in_progress' ? 1 : 0),
          completed: accumulator.completed + (item.status === 'completed' ? 1 : 0),
        }),
        {
          total: 0,
          recommended: 0,
          inProgress: 0,
          completed: 0,
        }
      ),
    [filteredAssignments]
  );

  const submitDisabled = !selectedAssignment || !responseText.trim().length || submitMutation.isPending;
  const assignmentDetails = detailsQuery.data?.assignment ?? selectedAssignment;
  const displayAssignment = assignmentDetails ?? selectedAssignment;
  const generatedTest = assignmentDetails?.generatedTest ?? null;
  const generatedTestHref =
    generatedTest?.testId && assignmentDetails
      ? buildGeneratedTestHref(assignmentDetails.module, generatedTest.testId)
      : null;

  const handleAssignmentSelect = (assignmentId: number) => {
    setValues({ assignment: String(assignmentId) });
  };

  const handleSubmitAttempt = async () => {
    if (!selectedAssignment || !responseText.trim().length) {
      return;
    }

    await submitMutation.mutateAsync({
      assignmentId: selectedAssignment.id,
      responseText: responseText.trim(),
    });

    await queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.root });
    enqueueSnackbar(tx('pages.ielts.assignments.submit_success'), { variant: 'success' });
  };

  const handleGenerateTest = async () => {
    if (!selectedAssignment) {
      return;
    }

    await generateTestMutation.mutateAsync({ assignmentId: selectedAssignment.id });
    await queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.root });
    enqueueSnackbar(tx('pages.ielts.assignments.generate_test_queued'), { variant: 'success' });
  };

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / rowsPerPage));

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.assignments.title')}
        description={
          examId !== null
            ? tx('pages.ielts.assignments.description_exam', { examId })
            : tx('pages.ielts.assignments.description')
        }
        action={
          <Button component={RouterLink} href={paths.ielts.myTests} variant="outlined" color="inherit">
            {tx('pages.ielts.my_tests.title')}
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.total_results', { count: counts.total })}
            value={String(counts.total)}
            icon="solar:checklist-minimalistic-bold-duotone"
            color="primary"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.assignments.status_recommended')}
            value={String(counts.recommended)}
            icon="solar:lightbulb-bold-duotone"
            color="warning"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.status_in_progress')}
            value={String(counts.inProgress)}
            icon="solar:play-circle-bold-duotone"
            color="info"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.status_completed')}
            value={String(counts.completed)}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="success"
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label={tx('pages.ielts.shared.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <TextField
              select
              label={tx('pages.ielts.shared.module')}
              value={moduleFilter}
              onChange={(event) => setValues({ module: event.target.value, page: 1 })}
              sx={{ minWidth: { md: 180 } }}
            >
              <MenuItem value="all">{tx('pages.ielts.shared.all_modules')}</MenuItem>
              <MenuItem value="reading">{tx('pages.ielts.reading.title')}</MenuItem>
              <MenuItem value="listening">{tx('pages.ielts.listening.title')}</MenuItem>
              <MenuItem value="writing">{tx('pages.ielts.writing.title')}</MenuItem>
              <MenuItem value="speaking">{tx('pages.ielts.speaking.title')}</MenuItem>
            </TextField>

            <TextField
              select
              label={tx('pages.ielts.shared.status')}
              value={statusFilter}
              onChange={(event) => setValues({ status: event.target.value, page: 1 })}
              sx={{ minWidth: { md: 180 } }}
            >
              <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
              <MenuItem value="recommended">{tx('pages.ielts.assignments.status_recommended')}</MenuItem>
              <MenuItem value="in_progress">{tx('pages.ielts.shared.status_in_progress')}</MenuItem>
              <MenuItem value="completed">{tx('pages.ielts.shared.status_completed')}</MenuItem>
              <MenuItem value="cancelled">{tx('pages.ielts.assignments.status_cancelled')}</MenuItem>
            </TextField>
          </Stack>

          {examId !== null ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Chip
                color="primary"
                variant="soft"
                label={tx('pages.ielts.assignments.exam_focus', { examId })}
              />
              <Button size="small" onClick={() => setValues({ exam: '', page: 1 })}>
                {tx('pages.ielts.assignments.clear_exam_focus')}
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Card
            variant="outlined"
            sx={(theme) => ({
              p: 2.5,
              borderColor: alpha(theme.palette.primary.main, 0.18),
            })}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.assignments.practice_weak_areas')}
              </Typography>

              {assignmentsQuery.isPending && !assignmentsQuery.data ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.assignments.loading')}
                </Typography>
              ) : null}

              {!assignmentsQuery.isPending && filteredAssignments.length === 0 ? (
                <EmptyContent
                  filled
                  title={tx('pages.ielts.assignments.empty_title')}
                  description={
                    examId !== null
                      ? tx('pages.ielts.assignments.empty_description_exam', { examId })
                      : tx('pages.ielts.assignments.empty_description')
                  }
                />
              ) : null}

              <Stack spacing={1.5}>
                {pagedAssignments.map((item) => {
                  const isSelected = item.id === selectedAssignment?.id;

                  return (
                    <Card
                      key={item.id}
                      variant="outlined"
                      sx={(theme) => ({
                        p: 1.75,
                        cursor: 'pointer',
                        borderColor: isSelected ? theme.palette.primary.main : undefined,
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : undefined,
                      })}
                      onClick={() => handleAssignmentSelect(item.id)}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          spacing={1}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                          <Typography variant="subtitle2">{item.title}</Typography>
                          <Chip
                            size="small"
                            color={resolveAssignmentStatusColor(item.status)}
                            label={translateAssignmentStatus(item.status, tx)}
                          />
                        </Stack>

                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {item.instructions}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={tx(`pages.ielts.${item.module}.title`)}
                          />
                          {item.skillGap?.label ? (
                            <Chip size="small" variant="outlined" label={item.skillGap.label} />
                          ) : null}
                          <Chip
                            size="small"
                            color={item.generatedTest.status === 'ready' ? 'success' : 'default'}
                            variant={item.generatedTest.status === 'ready' ? 'soft' : 'outlined'}
                            label={translateGenerationStatus(item.generatedTest.status, tx)}
                          />
                        </Stack>

                        {item.generatedTest.status === 'queued' || item.generatedTest.status === 'processing' ? (
                          <LinearProgress
                            variant="determinate"
                            value={item.generatedTest.progressPercent}
                            sx={{ height: 6, borderRadius: 999 }}
                          />
                        ) : null}

                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {sourceAttemptLabel(item, tx)}
                        </Typography>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>

              {filteredAssignments.length > rowsPerPage ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.shared.page_label', { page })}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      disabled={page <= 1}
                      onClick={() => listState.setPage(page - 2)}
                    >
                      {tx('pages.ielts.shared.previous_page')}
                    </Button>
                    <Button
                      size="small"
                      disabled={page >= totalPages}
                      onClick={() => listState.setPage(page)}
                    >
                      {tx('pages.ielts.shared.next_page')}
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          {!selectedAssignment ? (
            <Card variant="outlined" sx={{ p: 3 }}>
              <EmptyContent
                filled
                title={tx('pages.ielts.assignments.select_title')}
                description={tx('pages.ielts.assignments.select_description')}
              />
            </Card>
          ) : (
            <Card
              variant="outlined"
              sx={(theme) => ({
                p: 3,
                borderColor: alpha(theme.palette.primary.main, 0.18),
              })}
            >
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={1.5}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Stack spacing={0.75}>
                    <Typography variant="h5">{displayAssignment?.title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {displayAssignment?.instructions}
                    </Typography>
                  </Stack>

                  <Chip
                    color={resolveAssignmentStatusColor(displayAssignment?.status ?? 'recommended')}
                    label={translateAssignmentStatus(displayAssignment?.status ?? 'recommended', tx)}
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={tx(`pages.ielts.${displayAssignment?.module}.title`)} />
                  <Chip size="small" variant="outlined" label={displayAssignment ? sourceAttemptLabel(displayAssignment, tx) : ''} />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={tx('pages.ielts.assignments.recommended_at_value', {
                      date: fDateTime(displayAssignment?.recommendedAt),
                    })}
                  />
                </Stack>

                {detailsQuery.data?.skillGap ? (
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="subtitle2">{tx('pages.ielts.assignments.skill_gap')}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {detailsQuery.data.skillGap.label}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={assignmentProgressValue(detailsQuery.data)}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.ielts.assignments.severity')}: {Math.round(detailsQuery.data.skillGap.severityScore * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.ielts.assignments.occurrences')}: {detailsQuery.data.skillGap.occurrences}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Card>
                ) : null}

                {generatedTest ? (
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                      >
                        <Typography variant="subtitle2">
                          {tx('pages.ielts.assignments.generated_test_title')}
                        </Typography>
                        <Chip
                          size="small"
                          color={generatedTest.status === 'ready' ? 'success' : 'default'}
                          variant={generatedTest.status === 'ready' ? 'soft' : 'outlined'}
                          label={translateGenerationStatus(generatedTest.status, tx)}
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={generatedTest.status === 'failed' ? 0 : generatedTest.progressPercent}
                        sx={{ height: 8, borderRadius: 999 }}
                      />

                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tx('pages.ielts.assignments.generation_progress_value', {
                          progress: generatedTest.progressPercent,
                        })}
                      </Typography>

                      {generatedTest.status === 'failed' && generatedTest.error ? (
                        <Alert severity="error">{generatedTest.error}</Alert>
                      ) : null}

                      {generatedTest.status === 'ready' && generatedTestHref ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                          <Button
                            component={RouterLink}
                            href={generatedTestHref}
                            variant="contained"
                            color="primary"
                          >
                            {tx('pages.ielts.assignments.open_generated_test')}
                          </Button>
                          <Button
                            component={RouterLink}
                            href={getModulePath((displayAssignment?.module ?? 'reading') as AssignmentModule)}
                            variant="outlined"
                            color="inherit"
                          >
                            {tx('pages.ielts.assignments.open_module_section')}
                          </Button>
                        </Stack>
                      ) : null}

                      {generatedTest.status !== 'ready' ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                          <LoadingButton
                            variant="contained"
                            color="primary"
                            loading={generateTestMutation.isPending || generatedTest.status === 'queued' || generatedTest.status === 'processing'}
                            disabled={generateTestMutation.isPending || generatedTest.status === 'queued' || generatedTest.status === 'processing'}
                            onClick={handleGenerateTest}
                          >
                            {tx('pages.ielts.assignments.generate_test')}
                          </LoadingButton>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {tx('pages.ielts.assignments.generate_test_hint')}
                          </Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Card>
                ) : null}

                {detailsQuery.data?.errorItems?.length ? (
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {tx('pages.ielts.assignments.source_errors')}
                    </Typography>

                    {detailsQuery.data.errorItems.map((item) => (
                      <Card key={item.id} variant="outlined" sx={{ p: 1.75 }}>
                        <Stack spacing={0.75}>
                          <Typography variant="subtitle2">{item.title}</Typography>
                          {item.prompt ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {item.prompt}
                            </Typography>
                          ) : null}
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            {item.userAnswer ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {tx('pages.ielts.shared.your_answer')}: {item.userAnswer}
                              </Typography>
                            ) : null}
                            {item.expectedAnswer ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {tx('pages.ielts.shared.correct_answer')}: {item.expectedAnswer}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : null}

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack spacing={1.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {tx('pages.ielts.assignments.submit_title')}
                  </Typography>
                  <TextField
                    multiline
                    minRows={6}
                    label={tx('pages.ielts.assignments.response_label')}
                    placeholder={tx('pages.ielts.assignments.response_placeholder')}
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <LoadingButton
                      variant="contained"
                      color="primary"
                      loading={submitMutation.isPending}
                      disabled={submitDisabled}
                      onClick={handleSubmitAttempt}
                    >
                      {tx('pages.ielts.assignments.submit_attempt')}
                    </LoadingButton>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {tx('pages.ielts.assignments.submit_hint')}
                    </Typography>
                  </Stack>
                </Stack>

                {detailsQuery.data?.attempts?.length ? (
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {tx('pages.ielts.assignments.attempts_history')}
                    </Typography>

                    {detailsQuery.data.attempts.map((attempt) => (
                      <Card key={attempt.id} variant="outlined" sx={{ p: 1.75 }}>
                        <Stack spacing={0.75}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography variant="subtitle2">
                              {tx('pages.ielts.assignments.attempt_id', { id: attempt.id })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {fDateTime(attempt.updatedAt)}
                            </Typography>
                          </Stack>

                          {typeof attempt.score === 'number' ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {tx('pages.ielts.assignments.score_value', { score: Math.round(attempt.score * 100) })}
                            </Typography>
                          ) : null}

                          {attempt.feedback ? (
                            <Alert severity="info">{attempt.feedback}</Alert>
                          ) : null}

                          {attempt.responseText ? (
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: 'background.default',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              <Typography variant="body2">{attempt.responseText}</Typography>
                            </Box>
                          ) : null}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.assignments.no_attempts')}
                  </Typography>
                )}
              </Stack>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
