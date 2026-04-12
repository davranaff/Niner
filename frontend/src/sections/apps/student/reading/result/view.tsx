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
import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import EmptyContent from 'src/components/empty-content';
import { fDateTime } from 'src/utils/format-time';
import { useParams, useRouter } from 'src/routes/hook';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
import { AppsAttemptResultSkeleton } from 'src/sections/apps/common/module-test/result/skeleton';
import { AttemptAiSummaryCard } from 'src/sections/apps/common/module-test/result/attempt-ai-summary-card';
import { PostExamAssignmentsCard } from 'src/sections/apps/common/module-test/result/post-exam-assignments-card';

import {
  fetchMyReadingExams,
  fetchReadingDetail,
  fetchReadingExamResult,
} from '../api/reading-requests';
import type { BackendExamResultStatus } from '../api/types';
import { getReadingPassages } from '../api/utils';

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

export default function AppsReadingResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();
  const attemptId = String(params.attemptId || '');
  const examId = useMemo(() => parseAttemptId(attemptId), [attemptId]);

  const resultQuery = useFetch(
    ['student-reading-attempt-result', examId],
    () => fetchReadingExamResult(examId),
    { enabled: examId > 0 }
  );
  const myExamsQuery = useFetch(
    ['student-reading-attempts-context', examId],
    () => fetchMyReadingExams({ readingOffset: 0, limit: 100 }),
    { enabled: examId > 0 }
  );

  const readingExam = useMemo(
    () =>
      myExamsQuery.data?.reading.items.find((item) => item.kind === 'reading' && item.id === examId) ??
      null,
    [examId, myExamsQuery.data?.reading.items]
  );

  const detailQuery = useFetch(
    ['student-reading-attempt-test-detail', readingExam?.testId],
    () => fetchReadingDetail(Number(readingExam?.testId)),
    { enabled: Boolean(readingExam?.testId) }
  );

  if (examId <= 0) {
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
              onClick={() => router.push(paths.ielts.reading)}
            >
              {tx('pages.ielts.shared.return_to_reading')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  if (resultQuery.isPending) {
    return (
      <Container maxWidth="lg">
        <AppsAttemptResultSkeleton />
      </Container>
    );
  }

  if (resultQuery.isError || !resultQuery.data) {
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
              onClick={() => router.push(paths.ielts.reading)}
            >
              {tx('pages.ielts.shared.return_to_reading')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  const result = resultQuery.data;
  const detail = detailQuery.data ?? null;
  const finishReason = resolveFinishReason(readingExam?.finishReason, result.result);
  const passages = detail ? getReadingPassages(detail) : [];
  const totalQuestions = passages.reduce((total, part) => total + part.questionsCount, 0) || null;
  const accuracyPercent =
    result.correctAnswers != null && totalQuestions
      ? Math.round((result.correctAnswers / totalQuestions) * 100)
      : null;
  const finishReasonLabel =
    finishReason === 'in_progress'
      ? tx('pages.ielts.shared.status_in_progress')
      : tx(`pages.ielts.shared.finish_${finishReason}`);
  let finishReasonMetricColor: 'info' | 'warning' | 'success' = 'success';
  if (finishReason === 'in_progress') {
    finishReasonMetricColor = 'info';
  } else if (finishReason === 'time_is_up' || finishReason === 'left') {
    finishReasonMetricColor = 'warning';
  }
  const isLeftTerminated = finishReason === 'left';

  let rawScoreValue = '-';
  if (result.correctAnswers != null) {
    rawScoreValue =
      totalQuestions != null ? `${result.correctAnswers}/${totalQuestions}` : String(result.correctAnswers);
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={detail?.title ?? `Reading attempt #${examId}`}
        action={
          <Stack direction="row" spacing={1}>
            {detail ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.ielts.readingTest(String(detail.id)))}
              >
                {tx('pages.ielts.shared.details')}
              </Button>
            ) : null}

            <Button variant="outlined" color="inherit" onClick={() => router.push(paths.ielts.reading)}>
              {tx('pages.ielts.shared.return_to_reading')}
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
            value={formatRoundedBand(result.score)}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.raw_score')}
            value={rawScoreValue}
            icon="solar:target-bold-duotone"
            color="success"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.time_spent')}
            value={formatTimeSpent(result.timeSpent)}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.finish_reason')}
            value={finishReasonLabel}
            icon="solar:flag-2-bold-duotone"
            color={finishReasonMetricColor}
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
              <Chip size="small" variant="outlined" label={`ID #${examId}`} />
              <Chip
                size="small"
                color={resolveFinishReasonChipColor(finishReason)}
                label={finishReasonLabel}
              />
            </Stack>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.shared.raw_score')}: {rawScoreValue}
            {accuracyPercent != null ? ` · ${accuracyPercent}%` : ''}
          </Typography>

          {accuracyPercent != null ? (
            <Stack spacing={0.75}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.answered_count', {
                  answered: result.correctAnswers ?? 0,
                  total: totalQuestions ?? 0,
                })}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={accuracyPercent}
                sx={{ height: 8, borderRadius: 999 }}
              />
            </Stack>
          ) : null}

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.question_count')}
              </Typography>
              <Typography variant="subtitle2">{totalQuestions ?? '-'}</Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.time_spent')}
              </Typography>
              <Typography variant="subtitle2">{formatTimeSpent(result.timeSpent)}</Typography>
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
                {readingExam?.finishedAt || readingExam?.startedAt
                  ? fDateTime(readingExam?.finishedAt || readingExam?.startedAt)
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
        <AttemptAiSummaryCard module="reading" examId={examId} />
      )}

      <PostExamAssignmentsCard module="reading" examId={examId} />

      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {tx('pages.ielts.shared.section_breakdown')}
          </Typography>

          {passages.length ? (
            <>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack spacing={1.25}>
                {passages.map((passage) => (
                  <Card
                    key={passage.id}
                    variant="outlined"
                    sx={{ p: 1.5, borderStyle: 'dashed', bgcolor: 'background.default' }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
                          {tx('pages.ielts.shared.passage_label', { number: passage.passageNumber })}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {passage.title}
                        </Typography>
                      </Stack>

                      <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tx('pages.ielts.shared.question_count')}: {passage.questionsCount}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {totalQuestions
                            ? `${Math.round((passage.questionsCount / totalQuestions) * 100)}%`
                            : '-'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.result_summary_only')}
            </Typography>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
