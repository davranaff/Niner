import { useMemo } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useFetch } from 'src/hooks/api';
import { paths } from 'src/routes/paths';
import { useLocales } from 'src/locales';
import EmptyContent from 'src/components/empty-content';
import { fDateTime } from 'src/utils/format-time';
import { useParams, useRouter } from 'src/routes/hook';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
import { AppsAttemptResultSkeleton } from 'src/sections/apps/common/module-test/result/skeleton';
import { AttemptAiSummaryCard } from 'src/sections/apps/common/module-test/result/attempt-ai-summary-card';

import {
  fetchMyWritingExams,
  fetchWritingExamResult,
} from '../api/writing-requests';
import type { BackendExamResultStatus } from '../api/types';
import { getWritingParts, getWritingStoredResult } from '../api/utils';
import { useWritingDetailQuery } from '../api/use-writing-api';

function resolveReviewChipColor(isChecked: boolean) {
  return isChecked ? 'success' : 'warning';
}

function parseAttemptId(rawAttemptId: string): number {
  const asNumber = Number(rawAttemptId);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const trailingDigitsMatch = rawAttemptId.match(/(\d+)$/);
  if (!trailingDigitsMatch) {
    return 0;
  }

  const parsed = Number(trailingDigitsMatch[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function resolveFinishReason(
  explicitFinishReason: string | null | undefined,
  resultStatus: BackendExamResultStatus
) {
  if (explicitFinishReason) {
    return explicitFinishReason;
  }
  if (resultStatus === 'success') {
    return 'completed';
  }
  if (resultStatus === 'failed') {
    return 'time_is_up';
  }
  return 'in_progress';
}

function resolveFinishReasonChipColor(
  finishReason: string
): 'success' | 'warning' | 'default' {
  if (finishReason === 'completed') {
    return 'success';
  }
  if (finishReason === 'time_is_up' || finishReason === 'left') {
    return 'warning';
  }
  return 'default';
}

function formatTimeSpent(timeSpent: number | null | undefined) {
  if (timeSpent == null) {
    return '-';
  }

  return `${Math.round(timeSpent / 60)}m`;
}

export default function AppsWritingResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();

  const attemptId = useMemo(
    () => parseAttemptId(String(params.attemptId || '')),
    [params.attemptId]
  );
  const storedResult = getWritingStoredResult(attemptId);

  const backendResultQuery = useFetch(
    ['student-writing-attempt-result', attemptId],
    () => fetchWritingExamResult(attemptId),
    { enabled: attemptId > 0 }
  );
  const myExamsQuery = useFetch(
    ['student-writing-attempts-context', attemptId],
    () => fetchMyWritingExams({ writingOffset: 0, limit: 100 }),
    { enabled: attemptId > 0 }
  );

  const writingExam = useMemo(
    () =>
      myExamsQuery.data?.writing.items.find(
        (item) => item.kind === 'writing' && item.id === attemptId
      ) ?? null,
    [attemptId, myExamsQuery.data?.writing.items]
  );

  const detailQuery = useWritingDetailQuery(
    Number(writingExam?.testId ?? 0),
    Boolean(writingExam?.testId)
  );

  if (attemptId <= 0) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.ielts.shared.result_unavailable_title')}
          description={tx('pages.ielts.shared.result_unavailable_description')}
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={() => router.push(paths.ielts.writing)}
            >
              {tx('pages.ielts.shared.return_to_writing')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  if (!storedResult && backendResultQuery.isPending) {
    return (
      <Container maxWidth="lg">
        <AppsAttemptResultSkeleton />
      </Container>
    );
  }

  if (!storedResult && (backendResultQuery.isError || !backendResultQuery.data)) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.ielts.shared.result_unavailable_title')}
          description={tx('pages.ielts.shared.result_unavailable_description')}
          action={
            <Button
              variant="contained"
              color="inherit"
              onClick={() => router.push(paths.ielts.writing)}
            >
              {tx('pages.ielts.shared.return_to_writing')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  const backendResult = backendResultQuery.data ?? null;
  const detail = detailQuery.data ?? null;
  const detailParts = detail ? getWritingParts(detail) : [];
  const resultStatus: BackendExamResultStatus =
    storedResult?.result ?? backendResult?.result ?? 'in_progress';
  const finishReason = resolveFinishReason(
    storedResult?.finishReason ?? writingExam?.finishReason,
    resultStatus
  );
  const finishReasonLabel =
    finishReason === 'in_progress'
      ? tx('pages.ielts.shared.status_in_progress')
      : tx(`pages.ielts.shared.finish_${finishReason}`);
  const isLeftTerminated = finishReason === 'left';

  const score = storedResult?.score ?? backendResult?.score ?? null;
  const timeSpent = storedResult?.timeSpent ?? backendResult?.timeSpent ?? null;
  const totalTasks =
    storedResult?.totalTasks ?? (detailParts.length > 0 ? detailParts.length : null);
  const reviewedTasks = storedResult?.reviewedTasks ?? null;
  const reviewedPercent =
    reviewedTasks != null && totalTasks ? Math.round((reviewedTasks / totalTasks) * 100) : null;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={storedResult?.testTitle ?? detail?.title ?? `Writing attempt #${attemptId}`}
        action={
          <Stack direction="row" spacing={1}>
            {detail ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.ielts.writingTest(String(detail.id)))}
              >
                {tx('pages.ielts.shared.details')}
              </Button>
            ) : null}

            <Button variant="outlined" color="inherit" onClick={() => router.push(paths.ielts.writing)}>
              {tx('pages.ielts.shared.return_to_writing')}
            </Button>
          </Stack>
        }
      />

      {finishReason === 'in_progress' ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.session_locked')}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.estimated_band')}
            value={formatRoundedBand(score)}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.task_count')}
            value={totalTasks != null ? String(totalTasks) : '-'}
            icon="solar:checklist-minimalistic-bold-duotone"
            color="success"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.reviewed_tasks')}
            value={
              reviewedTasks != null && totalTasks != null ? `${reviewedTasks}/${totalTasks}` : '-'
            }
            icon="solar:clipboard-check-bold-duotone"
            color="warning"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.time_spent')}
            value={formatTimeSpent(timeSpent)}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>
      </Grid>

      <Card
        variant="outlined"
        sx={(theme) => ({
          p: 3,
          mb: 3,
          borderColor: alpha(theme.palette.primary.main, 0.18),
        })}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tx('pages.ielts.shared.session_summary')}
            </Typography>

            <Stack direction="row" spacing={1}>
              <Chip size="small" variant="outlined" label={`ID #${attemptId}`} />
              <Chip
                size="small"
                color={resolveFinishReasonChipColor(finishReason)}
                label={finishReasonLabel}
              />
            </Stack>
          </Stack>

          {reviewedTasks != null && totalTasks != null ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.reviewed_tasks')}: {reviewedTasks}/{totalTasks}
              {reviewedPercent != null ? ` · ${reviewedPercent}%` : ''}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.result_summary_only')}
            </Typography>
          )}

          {reviewedPercent != null ? (
            <Stack spacing={0.75}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.reviewed_tasks')}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={reviewedPercent}
                sx={{ height: 8, borderRadius: 999 }}
              />
            </Stack>
          ) : null}

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.task_count')}
              </Typography>
              <Typography variant="subtitle2">{totalTasks ?? '-'}</Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.time_spent')}
              </Typography>
              <Typography variant="subtitle2">{formatTimeSpent(timeSpent)}</Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.status')}
              </Typography>
              <Typography variant="subtitle2">{finishReasonLabel}</Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.updated')}
              </Typography>
              <Typography variant="subtitle2">
                {writingExam?.finishedAt || writingExam?.startedAt
                  ? fDateTime(writingExam?.finishedAt || writingExam?.startedAt)
                  : '-'}
              </Typography>
            </Grid>
          </Grid>
        </Stack>
      </Card>

      {isLeftTerminated ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.ai_summary_left_unavailable')}
        </Alert>
      ) : (
        <AttemptAiSummaryCard module="writing" examId={attemptId} />
      )}

      {detailParts.length ? (
        <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tx('pages.ielts.shared.section_breakdown')}
            </Typography>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={1.25}>
              {detailParts.map((part) => (
                <Card
                  key={part.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderStyle: 'dashed', bgcolor: 'background.default' }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
                      {tx('pages.ielts.shared.task_label', { number: part.order })}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}
                    >
                      {part.prompt.text}
                    </Typography>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      ) : null}

      {!storedResult ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.result_summary_only')}
        </Alert>
      ) : null}

      {storedResult?.answers?.length ? (
        <Stack spacing={2.5}>
          {storedResult.answers.map((answer) => (
            <Card key={answer.id} variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {answer.taskLabel}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {answer.wordCount} {tx('pages.ielts.shared.words')}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {answer.score != null ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${tx('pages.ielts.shared.estimated_band')}: ${formatRoundedBand(answer.score)}`}
                      />
                    ) : null}
                    <Chip
                      size="small"
                      color={resolveReviewChipColor(answer.isChecked)}
                      label={tx(
                        `pages.ielts.shared.review_status_${answer.isChecked ? 'checked' : 'pending'}`
                      )}
                    />
                  </Stack>
                </Stack>

                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {answer.promptText}
                </Typography>

                <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'background.neutral' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {answer.essay}
                  </Typography>
                </Card>

                {answer.corrections ? (
                  <Alert severity={answer.isChecked ? 'success' : 'info'}>{answer.corrections}</Alert>
                ) : null}
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : null}
    </Container>
  );
}
