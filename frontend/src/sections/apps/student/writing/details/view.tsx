import { useMemo, useState, type ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hook';
import { fDate, fDateTime } from 'src/utils/format-time';
import { AppsPageHeader, AppsStatusChip, InsightListCard, MetricCard } from 'src/pages/components/apps';
import { toModuleAttemptHistoryItems } from 'src/sections/apps/common/module-test/utils/attempt-history';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

import {
  findLatestStoredWritingResultForTest,
  findLatestUnfinishedWritingExamForTest,
  findLatestWritingExamForTest,
  getWritingActiveExamId,
  getWritingParts,
  getWritingTaskCount,
  getWritingTimeLimit,
  setWritingActiveExam,
} from '../api/utils';
import {
  useMyWritingExamsQuery,
  useStartWritingFlowMutation,
  useWritingDetailQuery,
} from '../api/use-writing-api';
import { WritingPromptAssets } from '../components';
import { WritingDetailSkeleton } from '../skeleton';

export default function AppsWritingDetailsView() {
  const { tx } = useLocales();
  const params = useParams();
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const testId = Number(params.testId || 0);

  const detailQuery = useWritingDetailQuery(testId, testId > 0);
  const examsQuery = useMyWritingExamsQuery({ enabled: testId > 0 });
  const startWritingFlowMutation = useStartWritingFlowMutation();

  const detail = detailQuery.data;
  const exams = useMemo(() => examsQuery.data?.items ?? [], [examsQuery.data?.items]);
  const storedActiveExamId = getWritingActiveExamId(testId);
  const latestActiveExam =
    findLatestUnfinishedWritingExamForTest(testId, exams) ?? null;
  const latestExam = findLatestWritingExamForTest(testId, exams);
  const latestStoredResult = findLatestStoredWritingResultForTest(testId);
  const writingParts = detail ? getWritingParts(detail) : [];
  const totalTasks = detail ? getWritingTaskCount(detail) : 0;
  const attemptHistoryItems = useMemo(
    () => toModuleAttemptHistoryItems('writing', exams, testId),
    [exams, testId]
  );

  let statusAlert: ReactNode = null;

  if (storedActiveExamId || latestActiveExam) {
    statusAlert = (
      <Alert severity="info" sx={{ mb: 3 }}>
        {tx('pages.ielts.shared.resume_available')}
      </Alert>
    );
  } else if (latestExam) {
    statusAlert = (
      <Alert severity="success" sx={{ mb: 3 }}>
        {tx('pages.ielts.shared.last_attempt')} #{latestExam.id}
      </Alert>
    );
  }

  const handleStart = async () => {
    if (!detail) {
      return;
    }

    setIsStarting(true);

    try {
      const exam = await startWritingFlowMutation.mutateAsync({
        testId: detail.id,
        examId: storedActiveExamId ?? latestActiveExam?.id,
      });

      setWritingActiveExam(detail.id, exam.id);
      router.push(paths.ielts.writingSession(String(detail.id)));
    } finally {
      setIsStarting(false);
    }
  };

  if (detailQuery.isLoading || !detail) {
    return (
      <Container maxWidth="lg">
        <WritingDetailSkeleton />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={detail.title}
        description={detail.description}
        action={
          <Stack direction="row" spacing={1.5}>
            {latestStoredResult ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() =>
                  router.push(paths.ielts.writingAttempt(String(latestStoredResult.examId)))
                }
              >
                {tx('pages.ielts.shared.open_last_result')}
              </Button>
            ) : null}

            <LoadingButton
              variant="contained"
              color="inherit"
              loading={isStarting}
              onClick={handleStart}
            >
              {storedActiveExamId || latestActiveExam
                ? tx('pages.ielts.shared.continue')
                : tx('pages.ielts.shared.start')}
            </LoadingButton>
          </Stack>
        }
      />

      {statusAlert}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.about_test')}
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {detail.description}
              </Typography>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack spacing={1.5}>
                {writingParts.map((part) => (
                  <Card key={part.id} variant="outlined" sx={{ p: 2.5 }}>
                    <Stack spacing={1.25}>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">
                          {tx('pages.ielts.shared.task_label', { number: part.order })}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                          {part.prompt.text}
                        </Typography>
                      </Stack>

                      <WritingPromptAssets
                        imageUrls={part.prompt.imageUrls}
                        fileUrls={part.prompt.fileUrls}
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>

          {attemptHistoryItems.length > 0 ? (
            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.shared.attempt_history')} ({attemptHistoryItems.length})
                </Typography>

                <Stack spacing={0.9}>
                  {attemptHistoryItems.map((attempt) => (
                    <ButtonBase
                      key={attempt.id}
                      component={RouterLink}
                      href={paths.ielts.writingAttempt(String(attempt.id))}
                      sx={{ width: 1, borderRadius: 1, textAlign: 'left' }}
                    >
                      <Card
                        variant="outlined"
                        sx={(theme) => ({
                          width: 1,
                          p: 1.25,
                          borderStyle: 'dashed',
                          transition: theme.transitions.create(['border-color', 'background-color'], {
                            duration: theme.transitions.duration.shorter,
                          }),
                          '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.38),
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                          },
                        })}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                          <Stack spacing={0.25}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              ID #{attempt.id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {tx('pages.ielts.shared.updated')}:{' '}
                              {attempt.updatedAt ? fDateTime(attempt.updatedAt) : '-'}
                            </Typography>
                          </Stack>
                          <AppsStatusChip
                            status={attempt.status}
                            label={tx(`pages.ielts.shared.status_${attempt.status}`)}
                          />
                        </Stack>
                      </Card>
                    </ButtonBase>
                  ))}
                </Stack>
              </Stack>
            </Card>
          ) : null}
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.duration')}
                value={`${Math.ceil(getWritingTimeLimit(detail) / 60)}m`}
                icon="solar:clock-circle-bold-duotone"
                color="info"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.task_count')}
                value={String(totalTasks)}
                icon="solar:checklist-minimalistic-bold-duotone"
                color="success"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.sections')}
                value={String(writingParts.length)}
                icon="solar:notes-bold-duotone"
                color="warning"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.best_band')}
                value={formatRoundedBand(latestStoredResult?.score)}
                helper={fDate(detail.createdAt)}
                icon="solar:medal-ribbon-star-bold-duotone"
                color="primary"
              />
            </Grid>
          </Grid>

          <Stack sx={{ mt: 3 }}>
            <InsightListCard
              title={tx('pages.ielts.shared.test_tips')}
              items={[
                tx('pages.ielts.shared.tip_writing_1'),
                tx('pages.ielts.shared.tip_writing_2'),
                tx('pages.ielts.shared.tip_writing_3'),
              ]}
              emptyLabel="-"
            />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
