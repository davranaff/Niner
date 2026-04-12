import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hook';
import EmptyContent from 'src/components/empty-content';
import { fDateTime } from 'src/utils/format-time';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

import { useOverallExamResultQuery } from '../api/use-overall-api';
import type { BackendOverallModuleAttempt, OverallModule } from '../api/types';

function formatTimeSpent(value: number | null | undefined) {
  if (value == null) {
    return '-';
  }
  return `${Math.round(value / 60)}m`;
}

function moduleResultPath(module: OverallModule, examId: number) {
  if (module === 'listening') return paths.ielts.listeningAttempt(String(examId));
  if (module === 'reading') return paths.ielts.readingAttempt(String(examId));
  return paths.ielts.writingAttempt(String(examId));
}

function moduleTitle(module: OverallModule, tx: (key: string) => string) {
  if (module === 'listening') return tx('pages.ielts.listening.title');
  if (module === 'reading') return tx('pages.ielts.reading.title');
  return tx('pages.ielts.writing.title');
}

function moduleStatusLabel(
  item: BackendOverallModuleAttempt,
  tx: (key: string, options?: Record<string, string | number>) => string
) {
  if (item.status === 'not_started') return tx('pages.ielts.shared.status_not_started');
  if (item.status === 'in_progress') return tx('pages.ielts.shared.status_in_progress');
  if (item.status === 'terminated') return tx('pages.ielts.shared.status_terminated');
  if (item.finishReason === 'left' || item.finishReason === 'time_is_up') {
    return tx(`pages.ielts.shared.finish_${item.finishReason}`);
  }
  return tx('pages.ielts.shared.status_completed');
}

function moduleStatusColor(
  item: BackendOverallModuleAttempt
): 'default' | 'success' | 'warning' | 'info' {
  if (item.status === 'in_progress') return 'info';
  if (item.status === 'terminated' || item.finishReason === 'left' || item.finishReason === 'time_is_up') {
    return 'warning';
  }
  if (item.status === 'completed') return 'success';
  return 'default';
}

function overallResultLabel(
  result: 'in_progress' | 'success' | 'failed',
  tx: (key: string, options?: Record<string, string | number>) => string
) {
  if (result === 'success') return tx('pages.ielts.shared.finish_completed');
  if (result === 'failed') return tx('pages.ielts.shared.finish_time_is_up');
  return tx('pages.ielts.shared.status_in_progress');
}

function overallResultColor(
  result: 'in_progress' | 'success' | 'failed'
): 'success' | 'warning' | 'info' {
  if (result === 'success') return 'success';
  if (result === 'failed') return 'warning';
  return 'info';
}

export default function AppsOverallExamResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();
  const overallId = useMemo(() => Number(params.overallId || 0), [params.overallId]);

  const resultQuery = useOverallExamResultQuery(overallId, overallId > 0);

  if (overallId <= 0) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.ielts.shared.result_unavailable_title')}
          description={tx('pages.ielts.shared.result_unavailable_description')}
          action={
            <Button variant="contained" color="inherit" onClick={() => router.push(paths.ielts.overallExam)}>
              {tx('pages.ielts.overall.title')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  if (resultQuery.isError || (!resultQuery.isLoading && !resultQuery.data)) {
    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.ielts.shared.result_unavailable_title')}
          description={tx('pages.ielts.shared.result_unavailable_description')}
          action={
            <Button variant="contained" color="inherit" onClick={() => router.push(paths.ielts.overallExam)}>
              {tx('pages.ielts.overall.title')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  if (resultQuery.isLoading || !resultQuery.data) {
    return (
      <Container maxWidth="lg">
        <Card variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.shared.status_in_progress')}
          </Typography>
        </Card>
      </Container>
    );
  }

  const result = resultQuery.data;
  const isPendingBand = result.overallBandPending;
  const finishLabel = result.finishReason
    ? tx(`pages.ielts.shared.finish_${result.finishReason}`)
    : tx('pages.ielts.shared.status_in_progress');

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.overall.result_title')}
        description={tx('pages.ielts.overall.result_description')}
        action={
          <Button variant="outlined" color="inherit" onClick={() => router.push(paths.ielts.overallExam)}>
            {tx('pages.ielts.overall.title')}
          </Button>
        }
      />

      {result.status === 'terminated' ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.integrity_terminated')}
        </Alert>
      ) : null}

      <Card
        variant="outlined"
        sx={(theme) => ({
          mb: 3,
          p: 3,
          borderColor: alpha(theme.palette.primary.main, 0.24),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        })}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.overall.overall_band')}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.1 }}>
                {isPendingBand ? tx('pages.ielts.overall.band_pending') : formatRoundedBand(result.overallBand)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={overallResultColor(result.result)}
                label={overallResultLabel(result.result, tx)}
              />
              <Chip size="small" variant="outlined" label={finishLabel} />
              <Chip
                size="small"
                variant="outlined"
                label={result.finishedAt ? fDateTime(result.finishedAt) : tx('pages.ielts.shared.status_in_progress')}
              />
            </Stack>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.overall.result_description')}
          </Typography>
        </Stack>
      </Card>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.overall.overall_result')}
            value={overallResultLabel(result.result, tx)}
            icon="solar:check-circle-bold-duotone"
            color={overallResultColor(result.result)}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.overall.overall_band')}
            value={
              isPendingBand ? tx('pages.ielts.overall.band_pending') : formatRoundedBand(result.overallBand)
            }
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.finish_reason')}
            value={finishLabel}
            icon="solar:flag-2-bold-duotone"
            color={result.status === 'terminated' ? 'warning' : 'info'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.updated')}
            value={result.finishedAt ? fDateTime(result.finishedAt) : '-'}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {tx('pages.ielts.overall.modules_breakdown')}
          </Typography>
          <Divider sx={{ borderStyle: 'dashed' }} />

          {result.modules.map((item) => (
            <Card
              key={item.module}
              variant="outlined"
              sx={(theme) => ({
                p: 2.25,
                borderColor: alpha(theme.palette.primary.main, 0.16),
                bgcolor: 'common.white',
              })}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'flex-start' }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {moduleTitle(item.module, tx)}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      color={moduleStatusColor(item)}
                      label={moduleStatusLabel(item, tx)}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        item.score != null
                          ? `${tx('pages.ielts.shared.estimated_band')}: ${formatRoundedBand(item.score)}`
                          : tx('pages.ielts.overall.band_pending')
                      }
                    />
                    <Chip size="small" variant="outlined" label={formatTimeSpent(item.timeSpent)} />
                  </Stack>
                </Stack>

                <Box sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
                  {item.examId ? (
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      onClick={() => router.push(moduleResultPath(item.module, item.examId as number))}
                    >
                      {tx('pages.ielts.shared.open_result')}
                    </Button>
                  ) : null}
                </Box>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Card>
    </Container>
  );
}
