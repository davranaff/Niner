import { useMemo } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import LoadingButton from '@mui/lab/LoadingButton';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hook';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';
import { fDateTime } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

import { useOverallExamListQuery, useOverallExamStartMutation } from './api/use-overall-api';
import type { BackendOverallExamListItem } from './api/types';

function resolveOverallStatusLabel(
  item: BackendOverallExamListItem,
  tx: (key: string, options?: Record<string, string | number>) => string
) {
  if (item.status === 'in_progress') {
    return tx('pages.ielts.shared.status_in_progress');
  }
  if (item.status === 'terminated') {
    return tx('pages.ielts.shared.status_terminated');
  }
  return item.result === 'success'
    ? tx('pages.ielts.shared.finish_completed')
    : tx('pages.ielts.shared.finish_time_is_up');
}

function resolveOverallStatusColor(
  item: BackendOverallExamListItem
): 'default' | 'success' | 'warning' | 'info' {
  if (item.status === 'in_progress') return 'info';
  if (item.status === 'terminated') return 'warning';
  return item.result === 'success' ? 'success' : 'warning';
}

function resolveFinishLabel(
  item: BackendOverallExamListItem,
  tx: (key: string, options?: Record<string, string | number>) => string
) {
  if (item.finishReason) {
    return tx(`pages.ielts.shared.finish_${item.finishReason}`);
  }
  if (item.status === 'in_progress') {
    return tx('pages.ielts.shared.status_in_progress');
  }
  return resolveOverallStatusLabel(item, tx);
}

export default function AppsOverallExamView() {
  const { tx } = useLocales();
  const router = useRouter();

  const listQuery = useOverallExamListQuery({ limit: 20, offset: 0, ordering: '-updated_at' });
  const startMutation = useOverallExamStartMutation();

  const attempts = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const activeAttempt = useMemo(
    () => attempts.find((item) => item.status === 'in_progress') ?? null,
    [attempts]
  );
  const completedCount = useMemo(
    () => attempts.filter((item) => item.status === 'completed').length,
    [attempts]
  );
  const inProgressCount = useMemo(
    () => attempts.filter((item) => item.status === 'in_progress').length,
    [attempts]
  );
  const bestOverallBand = useMemo(() => {
    const values = attempts
      .filter((item) => !item.overallBandPending && item.overallBand != null)
      .map((item) => Number(item.overallBand));
    if (!values.length) {
      return null;
    }
    return Math.max(...values);
  }, [attempts]);
  const latestUpdatedAt = useMemo(() => attempts[0]?.updatedAt ?? null, [attempts]);

  const handleStart = async () => {
    const payload = await startMutation.mutateAsync(undefined);
    router.push(paths.ielts.overallExamSession(String(payload.id)));
  };

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.overall.title')}
        description={tx('pages.ielts.overall.description')}
      />

      <Card
        variant="outlined"
        sx={(theme) => ({
          p: 3,
          mb: 2.5,
          borderColor: alpha(theme.palette.primary.main, 0.22),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        })}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {tx('pages.ielts.overall.title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.overall.description')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" variant="outlined" label={tx('pages.ielts.listening.title')} />
                <Chip size="small" variant="outlined" label={tx('pages.ielts.reading.title')} />
                <Chip size="small" variant="outlined" label={tx('pages.ielts.writing.title')} />
              </Stack>
            </Stack>

            <LoadingButton
              variant="contained"
              color="primary"
              onClick={handleStart}
              loading={startMutation.isPending}
            >
              {activeAttempt ? tx('pages.ielts.shared.continue') : tx('pages.ielts.shared.start')}
            </LoadingButton>
          </Stack>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={activeAttempt ? 'info' : 'default'}
              label={
                activeAttempt
                  ? `${tx('pages.ielts.shared.status_in_progress')} #${activeAttempt.id}`
                  : tx('pages.ielts.shared.status_not_started')
              }
            />
            <Chip
              size="small"
              variant="outlined"
              label={
                latestUpdatedAt
                  ? `${tx('pages.ielts.shared.updated')}: ${fDateTime(latestUpdatedAt)}`
                  : tx('pages.ielts.shared.updated')
              }
            />
          </Stack>
        </Stack>
      </Card>

      {activeAttempt ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {tx('pages.ielts.overall.resume_notice')}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.attempts')}
            value={String(attempts.length)}
            icon="solar:document-text-bold-duotone"
            color="primary"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.status_in_progress')}
            value={String(inProgressCount)}
            icon="solar:play-circle-bold-duotone"
            color="info"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.status_completed')}
            value={String(completedCount)}
            icon="solar:check-circle-bold-duotone"
            color="success"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.best_band')}
            value={bestOverallBand != null ? formatRoundedBand(bestOverallBand) : '-'}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="warning"
          />
        </Grid>
      </Grid>

      {listQuery.isError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {tx('pages.ielts.shared.empty_description')}
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tx('pages.ielts.overall.history_title')}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={tx('pages.ielts.shared.total_results', { count: attempts.length })}
            />
          </Stack>
          <Divider sx={{ borderStyle: 'dashed' }} />

          {attempts.length ? (
            attempts.map((item) => {
              const isInProgress = item.status === 'in_progress';
              const actionPath = isInProgress
                ? paths.ielts.overallExamSession(String(item.id))
                : paths.ielts.overallExamAttempt(String(item.id));
              const primaryBandLabel = item.overallBandPending
                ? tx('pages.ielts.overall.band_pending')
                : formatRoundedBand(item.overallBand);
              const finishLabel = resolveFinishLabel(item, tx);
              const statusColor = resolveOverallStatusColor(item);
              const updatedAt = item.finishedAt || item.startedAt || item.updatedAt;

              return (
                <Card
                  key={item.id}
                  variant="outlined"
                  sx={(theme) => ({
                    borderColor: isInProgress
                      ? alpha(theme.palette.primary.main, 0.26)
                      : alpha(theme.palette.divider, 0.9),
                    bgcolor: 'common.white',
                    p: 2,
                  })}
                >
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          #{item.id}
                        </Typography>
                        <Chip size="small" color={statusColor} label={resolveOverallStatusLabel(item, tx)} />
                        <Chip size="small" variant="outlined" label={finishLabel} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {updatedAt ? `${tx('pages.ielts.shared.updated')}: ${fDateTime(updatedAt)}` : '-'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        color={item.overallBandPending ? 'default' : 'success'}
                        label={primaryBandLabel}
                      />
                      <Button
                        size="small"
                        color="primary"
                        variant={isInProgress ? 'contained' : 'outlined'}
                        onClick={() => router.push(actionPath)}
                      >
                        {isInProgress ? tx('pages.ielts.shared.continue') : tx('pages.ielts.shared.open_result')}
                      </Button>
                    </Stack>
                  </Stack>
                </Card>
              );
            })
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.dashboard.empty_attempts')}
            </Typography>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
