import { useCallback } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import {
  AppsPageHeader,
  AppsStatusChip,
  InsightListCard,
  MetricCard,
} from 'src/pages/components/apps';
import { useLocales } from 'src/locales';
import { useRouter } from 'src/routes/hook';
import type { ActiveIeltsModule } from 'src/_mock/ielts';
import {
  useStartAttemptMutation,
  useTestDetailsQuery,
} from 'src/sections/apps/common/api/use-apps';
import {
  getModuleAttemptPath,
  getModuleSessionPath,
} from 'src/sections/apps/common/module-test/utils/module-meta';

import { AppsDetailSkeleton } from './skeleton';

type ModuleTestDetailsViewProps = {
  module: ActiveIeltsModule;
  testId: string;
};

export function ModuleTestDetailsView({ module, testId }: ModuleTestDetailsViewProps) {
  const { tx } = useLocales();
  const router = useRouter();
  const { data, isLoading } = useTestDetailsQuery(module, testId);
  const startAttemptMutation = useStartAttemptMutation();

  const handleStart = useCallback(async () => {
    if (!data) return;

    await startAttemptMutation.mutateAsync(data.test.id);
    router.push(getModuleSessionPath(module, data.test.id));
  }, [data, module, router, startAttemptMutation]);

  if (isLoading || !data) {
    return (
      <Container maxWidth="lg">
        <AppsDetailSkeleton />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={data.test.title}
        description={data.test.overview}
        action={
          <Stack direction="row" spacing={1.5}>
            {data.lastAttempt?.status === 'in_progress' ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(getModuleSessionPath(module, data.test.id))}
              >
                {tx('pages.ielts.shared.continue')}
              </Button>
            ) : null}

            <LoadingButton
              variant="contained"
              color="inherit"
              onClick={handleStart}
              loading={startAttemptMutation.isPending}
            >
              {data.lastAttempt?.status === 'completed' || data.lastAttempt?.status === 'terminated'
                ? tx('pages.ielts.shared.restart')
                : tx('pages.ielts.shared.start')}
            </LoadingButton>
          </Stack>
        }
      />

      {data.lastAttempt ? (
        <Alert
          severity={data.lastAttempt.status === 'terminated' ? 'warning' : 'info'}
          sx={{ mb: 3 }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2">{tx('pages.ielts.shared.last_attempt')}</Typography>
              <AppsStatusChip
                status={data.lastAttempt.status}
                label={tx(`pages.ielts.shared.status_${data.lastAttempt.status}`)}
              />
            </Stack>

            {data.lastAttempt.status !== 'in_progress' ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => router.push(getModuleAttemptPath(module, data.lastAttempt!.id))}
              >
                {tx('pages.ielts.shared.open_last_result')}
              </Button>
            ) : null}
          </Stack>
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.about_test')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {data.test.description}
              </Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack spacing={1}>
                {data.test.instructions.map((line) => (
                  <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>
                    • {line}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {module === 'writing'
                  ? tx('pages.ielts.shared.tasks')
                  : tx('pages.ielts.shared.sections')}
              </Typography>

              {module === 'writing'
                ? data.writingPrompts.map((prompt) => (
                    <Card key={prompt.id} variant="outlined" sx={{ p: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                        {prompt.taskLabel}: {prompt.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        {prompt.prompt}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tx('pages.ielts.shared.min_words')}: {prompt.minWords}
                      </Typography>
                    </Card>
                  ))
                : data.sections.map((section) => (
                    <Card key={section.id} variant="outlined" sx={{ p: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                        {section.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {section.instructions}
                      </Typography>
                    </Card>
                  ))}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.duration')}
                value={`${data.test.durationMinutes}m`}
                icon="solar:clock-circle-bold-duotone"
                color="info"
              />
            </Grid>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={
                  module === 'writing'
                    ? tx('pages.ielts.shared.task_count')
                    : tx('pages.ielts.shared.question_count')
                }
                value={String(module === 'writing' ? data.test.taskCount : data.test.questionCount)}
                icon="solar:checklist-minimalistic-bold-duotone"
                color="success"
              />
            </Grid>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.difficulty')}
                value={tx(`pages.ielts.shared.difficulty_${data.test.difficulty}`)}
                icon="solar:graph-new-bold-duotone"
                color="warning"
              />
            </Grid>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.best_band')}
                value={data.lastResult ? data.lastResult.estimatedBand.toFixed(1) : '-'}
                icon="solar:medal-ribbon-star-bold-duotone"
                color="primary"
              />
            </Grid>
          </Grid>

          <Stack sx={{ mt: 3 }}>
            <InsightListCard
              title={tx('pages.ielts.shared.test_tips')}
              items={
                module === 'writing'
                  ? [
                      tx('pages.ielts.shared.tip_writing_1'),
                      tx('pages.ielts.shared.tip_writing_2'),
                      tx('pages.ielts.shared.tip_writing_3'),
                    ]
                  : [
                      tx('pages.ielts.shared.tip_exam_1'),
                      tx('pages.ielts.shared.tip_exam_2'),
                      tx('pages.ielts.shared.tip_exam_3'),
                    ]
              }
              emptyLabel="-"
            />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
