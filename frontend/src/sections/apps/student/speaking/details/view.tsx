import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hook';
import { fDate } from 'src/utils/format-time';
import { AppsPageHeader, InsightListCard, MetricCard } from 'src/pages/components/apps';
import {
  buildGeneratedAssignmentHref,
  buildGeneratedTestOriginLabel,
  buildGeneratedTestSourceAttemptLabel,
} from 'src/sections/apps/common/module-test/generated-test-origin';

import {
  findLatestSpeakingExamForTest,
  findLatestUnfinishedSpeakingExamForTest,
  getSpeakingActiveExamId,
  getSpeakingRecentAttempt,
  setSpeakingActiveExam,
} from '../api/utils';
import { useMySpeakingExamsQuery, useSpeakingDetailQuery, useStartSpeakingFlowMutation } from '../api/use-speaking-api';
import { SpeakingDetailSkeleton } from '../skeleton';

export default function AppsSpeakingDetailsView() {
  const { tx } = useLocales();
  const params = useParams();
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const testId = Number(params.testId || 0);

  const detailQuery = useSpeakingDetailQuery(testId, testId > 0);
  const examsQuery = useMySpeakingExamsQuery({ enabled: testId > 0 });
  const startSpeakingFlowMutation = useStartSpeakingFlowMutation();

  const detail = detailQuery.data;
  const exams = examsQuery.data?.items ?? [];
  const storedActiveExamId = getSpeakingActiveExamId(testId);
  const latestActiveExam = findLatestUnfinishedSpeakingExamForTest(testId, exams) ?? null;
  const latestExam = findLatestSpeakingExamForTest(testId, exams);
  const latestStoredAttempt = latestExam ? getSpeakingRecentAttempt(latestExam.id) : null;

  const totalQuestions = detail?.parts.reduce((sum, part) => sum + part.questions.length, 0) ?? 0;

  const handleStart = async () => {
    if (!detail) {
      return;
    }

    setIsStarting(true);

    try {
      const exam = await startSpeakingFlowMutation.mutateAsync({
        testId: detail.id,
        examId: storedActiveExamId ?? latestActiveExam?.id,
      });

      setSpeakingActiveExam(detail.id, exam.id);
      router.push(paths.ielts.speakingSession(String(detail.id)));
    } finally {
      setIsStarting(false);
    }
  };

  if (detailQuery.isLoading || !detail) {
    return (
      <Container maxWidth="lg">
        <SpeakingDetailSkeleton />
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
            {latestExam && latestExam.status === 'completed' ? (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push(paths.ielts.speakingAttempt(String(latestExam.id)))}
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

      {storedActiveExamId || latestActiveExam ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.resume_available')}
        </Alert>
      ) : null}

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
                {detail.parts.map((part) => (
                  <Card key={part.id} variant="outlined" sx={{ p: 2.5 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2">{part.title}</Typography>
                        <Chip size="small" variant="outlined" label={`${part.durationMinutes} min`} />
                      </Stack>

                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {part.examinerGuidance}
                      </Typography>

                      <Stack spacing={0.75}>
                        {part.questions.slice(0, 3).map((question) => (
                          <Typography
                            key={question.id}
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block' }}
                          >
                            • {question.prompt}
                          </Typography>
                        ))}
                        {part.questions.length > 3 ? (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            +{part.questions.length - 3} more question(s)
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.duration')}
                value={`${detail.durationMinutes}m`}
                icon="solar:clock-circle-bold-duotone"
                color="info"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.sections')}
                value={String(detail.parts.length)}
                icon="solar:checklist-minimalistic-bold-duotone"
                color="success"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.question_count')}
                value={String(totalQuestions)}
                icon="solar:chat-round-dots-bold-duotone"
                color="warning"
              />
            </Grid>

            <Grid item xs={6} md={12}>
              <MetricCard
                label={tx('pages.ielts.shared.best_band')}
                value={
                  latestStoredAttempt?.overallBand != null
                    ? latestStoredAttempt.overallBand.toFixed(1)
                    : '-'
                }
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
                tx('pages.ielts.shared.tip_speaking_1'),
                tx('pages.ielts.shared.tip_speaking_2'),
                tx('pages.ielts.shared.tip_speaking_3'),
              ]}
              emptyLabel="-"
            />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
