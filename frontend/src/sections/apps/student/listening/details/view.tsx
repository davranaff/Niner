import { useEffect, useMemo, useState, type ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hook';
import { fDateTime } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
import {
  buildGeneratedAssignmentHref,
  buildGeneratedTestOriginLabel,
  buildGeneratedTestSourceAttemptLabel,
} from 'src/sections/apps/common/module-test/generated-test-origin';
import {
  AppsDetailSkeleton,
} from 'src/sections/apps/student/module-test/details/skeleton';
import {
  AppsPageHeader,
  AppsStatusChip,
  InsightListCard,
  MetricCard,
} from 'src/pages/components/apps';

import {
  useListeningDetailQuery,
  useMyListeningExamsQuery,
  useMyListeningTestsQuery,
  useStartListeningFlowMutation,
} from '../api/use-listening-api';
import {
  findLatestCompletedListeningExamForTest,
  findLatestListeningExamForTest,
  findLatestUnfinishedListeningExamForTest,
  getListeningActiveExamId,
  getListeningParts,
  getListeningTotalQuestions,
  getListeningTimeLimit,
  setListeningActiveExam,
} from '../api/utils';

const FULL_HISTORY_PAGE_SIZE = 10;

export default function AppsListeningDetailsView() {
  const { tx } = useLocales();
  const params = useParams();
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const testId = Number(params.testId || 0);

  const detailQuery = useListeningDetailQuery(testId, testId > 0);
  const examsQuery = useMyListeningExamsQuery({ enabled: testId > 0 });
  const previewAttemptsQuery = useMyListeningTestsQuery({
    testId,
    page: 1,
    rowsPerPage: 3,
    enabled: testId > 0,
  });
  const fullHistoryQuery = useMyListeningTestsQuery({
    testId,
    page: historyPage,
    rowsPerPage: FULL_HISTORY_PAGE_SIZE,
    enabled: testId > 0,
  });
  const startListeningFlowMutation = useStartListeningFlowMutation();

  useEffect(() => {
    setHistoryPage(1);
  }, [testId]);

  const detail = detailQuery.data;
  const exams = useMemo(() => examsQuery.data?.items ?? [], [examsQuery.data?.items]);
  const previewAttempts = previewAttemptsQuery.data?.items ?? [];
  const fullHistory = fullHistoryQuery.data ?? null;

  const storedActiveExamId = getListeningActiveExamId(testId);
  const latestActiveExam = findLatestUnfinishedListeningExamForTest(testId, exams) ?? null;
  const latestCompletedExam = findLatestCompletedListeningExamForTest(testId, exams);
  const latestExam = findLatestListeningExamForTest(testId, exams);
  const listeningParts = detail ? getListeningParts(detail) : [];
  const totalQuestions = detail ? getListeningTotalQuestions(detail) : 0;
  const bestBand = useMemo(() => {
    const bands = (fullHistory?.items ?? [])
      .map((item) => item.estimatedBand)
      .filter((value): value is number => typeof value === 'number');
    return bands.length ? Math.max(...bands) : null;
  }, [fullHistory?.items]);

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
      const exam = await startListeningFlowMutation.mutateAsync({
        testId: detail.id,
        examId: storedActiveExamId ?? latestActiveExam?.id,
      });

      setListeningActiveExam(detail.id, exam.id);
      router.push(paths.ielts.listeningSession(String(detail.id)));
    } finally {
      setIsStarting(false);
    }
  };

  if (detailQuery.isLoading || !detail) {
    return (
      <Container maxWidth="lg">
        <AppsDetailSkeleton />
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
            {latestCompletedExam ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.ielts.listeningAttempt(String(latestCompletedExam.id)))}
              >
                {tx('pages.ielts.shared.open_last_result')}
              </Button>
            ) : null}

            <LoadingButton variant="contained" color="primary" loading={isStarting} onClick={handleStart}>
              {storedActiveExamId || latestActiveExam
                ? tx('pages.ielts.shared.continue')
                : tx('pages.ielts.shared.start')}
            </LoadingButton>
          </Stack>
        }
      />

      {statusAlert}

      {detail.origin ? (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button component={RouterLink} href={buildGeneratedAssignmentHref(detail.origin)} color="inherit" size="small">
              {tx('pages.ielts.assignments.open_assignment')}
            </Button>
          }
        >
          {buildGeneratedTestOriginLabel(detail.origin, tx)}. {buildGeneratedTestSourceAttemptLabel(detail.origin, tx)}
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
                {detail.description}
              </Typography>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Stack spacing={1.5}>
                {listeningParts.map((part) => (
                  <Card key={part.id} variant="outlined" sx={{ p: 2.5 }}>
                    <Stack spacing={0.75}>
                      <Typography variant="subtitle2">
                        {tx('pages.ielts.shared.task_label', {
                          number: part.partNumber,
                        })}
                        : {part.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {tx('pages.ielts.shared.question_count')}: {part.questionsCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tx('pages.ielts.shared.sections')}: {part.questionBlocks.length}
                      </Typography>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>

          {previewAttempts.length > 0 ? (
            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.shared.attempt_history')} ({previewAttemptsQuery.data?.count ?? previewAttempts.length})
                </Typography>

                <Stack spacing={0.9}>
                  {previewAttempts.map((attempt) => (
                    <ButtonBase
                      key={attempt.id}
                      component={RouterLink}
                      href={
                        attempt.status === 'in_progress'
                          ? paths.ielts.listeningSession(String(testId))
                          : paths.ielts.listeningAttempt(String(attempt.id))
                      }
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

          {fullHistory && fullHistory.count > 0 ? (
            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.shared.attempt_history')} ({fullHistory.count})
                </Typography>

                <Stack spacing={0.9}>
                  {fullHistory.items.map((attempt) => (
                    <ButtonBase
                      key={attempt.id}
                      component={RouterLink}
                      href={
                        attempt.status === 'in_progress'
                          ? paths.ielts.listeningSession(String(testId))
                          : paths.ielts.listeningAttempt(String(attempt.id))
                      }
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
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.25}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Stack spacing={0.25}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              ID #{attempt.id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {tx('pages.ielts.shared.updated')}:{' '}
                              {attempt.updatedAt ? fDateTime(attempt.updatedAt) : '-'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {typeof attempt.estimatedBand === 'number' ? (
                              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                {formatRoundedBand(attempt.estimatedBand)}
                              </Typography>
                            ) : null}
                            <AppsStatusChip
                              status={attempt.status}
                              label={tx(`pages.ielts.shared.status_${attempt.status}`)}
                            />
                          </Stack>
                        </Stack>
                      </Card>
                    </ButtonBase>
                  ))}
                </Stack>

                {fullHistory.count > FULL_HISTORY_PAGE_SIZE ? (
                  <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                    <Pagination
                      page={historyPage}
                      count={Math.max(1, Math.ceil(fullHistory.count / FULL_HISTORY_PAGE_SIZE))}
                      onChange={(_event, nextPage) => setHistoryPage(nextPage)}
                    />
                  </Stack>
                ) : null}
              </Stack>
            </Card>
          ) : null}
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.duration')}
                value={`${Math.ceil(getListeningTimeLimit(detail) / 60)}m`}
                icon="solar:clock-circle-bold-duotone"
                color="info"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.question_count')}
                value={String(totalQuestions)}
                icon="solar:checklist-minimalistic-bold-duotone"
                color="success"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.sections')}
                value={String(listeningParts.length)}
                icon="solar:notes-bold-duotone"
                color="warning"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.best_band')}
                value={formatRoundedBand(bestBand)}
                icon="solar:medal-ribbon-star-bold-duotone"
                color="primary"
              />
            </Grid>
          </Grid>

          <Stack sx={{ mt: 3 }}>
            <InsightListCard
              title={tx('pages.ielts.shared.test_tips')}
              items={[
                tx('pages.ielts.shared.tip_exam_1'),
                tx('pages.ielts.shared.tip_exam_2'),
                tx('pages.ielts.shared.tip_exam_3'),
              ]}
              emptyLabel="-"
            />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
