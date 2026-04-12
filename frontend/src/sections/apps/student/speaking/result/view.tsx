import { useMemo } from 'react';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { alpha } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hook';
import { fDate } from 'src/utils/format-time';
import EmptyContent from 'src/components/empty-content';
import { AppsPageHeader, InsightListCard, MetricCard } from 'src/pages/components/apps';
import { PostExamAssignmentsCard } from 'src/sections/apps/common/module-test/result/post-exam-assignments-card';

import { getSpeakingRecentAttempt } from '../api/utils';
import { useSpeakingSessionQuery } from '../api/use-speaking-api';
import { SpeakingResultSkeleton } from '../skeleton';
import type { SpeakingAttempt, SpeakingSession } from '../types';

function clampProgress(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 100) return 100;
  return value;
}

function toAttemptFromSession(examId: number, session: SpeakingSession): SpeakingAttempt | null {
  if (session.status !== 'finished' && session.status !== 'terminated') {
    return null;
  }

  let status: SpeakingAttempt['status'] = 'completed';
  if (session.status === 'terminated') {
    status = 'terminated';
  } else if (session.integrityEvents.length) {
    status = 'suspicious';
  }

  return {
    id: session.attemptId,
    examId,
    sessionId: session.id,
    testId: session.testId,
    title: session.title,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    durationSeconds: session.elapsedSeconds,
    overallBand: session.result?.overallBand,
    criteria: session.result?.criteria ?? [],
    status,
    integrityEvents: session.integrityEvents,
    result: session.result,
    transcriptSegments: session.transcriptSegments,
    questionIds: session.askedQuestionIds,
  };
}

export default function AppsSpeakingResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();

  const examId = Number(params.attemptId || 0);
  const sessionQuery = useSpeakingSessionQuery(examId, examId > 0);
  const cachedAttempt = getSpeakingRecentAttempt(examId);

  const attempt = useMemo(() => {
    if (cachedAttempt) {
      return cachedAttempt;
    }
    if (!sessionQuery.data) {
      return null;
    }
    return toAttemptFromSession(examId, sessionQuery.data);
  }, [cachedAttempt, examId, sessionQuery.data]);

  const result = attempt?.result;
  const recentTranscript = attempt?.transcriptSegments.slice(-12) ?? [];

  if (!attempt && sessionQuery.isLoading) {
    return (
      <Container maxWidth="lg">
        <SpeakingResultSkeleton />
      </Container>
    );
  }

  if (!attempt || !result) {
    const inProgress =
      sessionQuery.data?.status === 'connected' ||
      sessionQuery.data?.status === 'waiting_for_user' ||
      sessionQuery.data?.status === 'examiner_speaking' ||
      sessionQuery.data?.status === 'user_speaking' ||
      sessionQuery.data?.status === 'discussion_mode' ||
      sessionQuery.data?.status === 'long_turn_listening' ||
      sessionQuery.data?.status === 'preparing_part2' ||
      sessionQuery.data?.status === 'preparation_mode' ||
      sessionQuery.data?.status === 'reconnecting';

    const fallbackDestination = inProgress
      ? paths.ielts.speakingSession(String(sessionQuery.data?.testId ?? examId))
      : paths.ielts.speaking;

    return (
      <Container maxWidth="lg">
        <EmptyContent
          filled
          title={tx('pages.ielts.shared.result_unavailable_title')}
          description={tx('pages.ielts.shared.result_unavailable_description')}
          action={
            <Button
              variant="contained"
              color="primary"
              onClick={() => router.push(fallbackDestination)}
            >
              {inProgress ? tx('pages.ielts.shared.continue') : tx('pages.ielts.shared.return_to_speaking')}
            </Button>
          }
          sx={{ py: 10 }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={attempt.title}
        action={
          <Button variant="outlined" color="primary" onClick={() => router.push(paths.ielts.speaking)}>
            {tx('pages.ielts.shared.return_to_speaking')}
          </Button>
        }
      />

      {attempt.status === 'terminated' || attempt.status === 'suspicious' ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.integrity_terminated')}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.estimated_band')}
            value={result.overallBand.toFixed(1)}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.time_spent')}
            value={`${Math.max(1, Math.round(attempt.durationSeconds / 60))}m`}
            helper={fDate(attempt.completedAt || attempt.startedAt)}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.question_count')}
            value={String(attempt.questionIds.length)}
            icon="solar:chat-round-dots-bold-duotone"
            color="success"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.finish_reason')}
            value={tx(
              attempt.status === 'terminated'
                ? 'pages.ielts.shared.finish_left'
                : 'pages.ielts.shared.finish_completed'
            )}
            icon="solar:flag-2-bold-duotone"
            color={attempt.status === 'terminated' ? 'error' : 'warning'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <PostExamAssignmentsCard module="speaking" examId={examId} />

          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.shared.criteria_breakdown')}
              </Typography>

              {result.criteria.map((criterion) => (
                <Stack key={criterion.key} spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2">{criterion.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {criterion.band.toFixed(1)}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={clampProgress((criterion.band / 9) * 100)}
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                    }}
                  />

                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {criterion.rationale}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.speaking.part_summary')}
              </Typography>

              {result.partSummaries.map((summary) => (
                <Card key={summary.partId} variant="outlined" sx={{ p: 2.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">{summary.title}</Typography>
                      <Chip size="small" variant="outlined" label={summary.estimatedBand.toFixed(1)} />
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {summary.summary}
                    </Typography>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tx('pages.ielts.speaking.transcript_preview')}
              </Typography>

              <Stack spacing={1.25}>
                {recentTranscript.length ? (
                  recentTranscript.map((segment) => (
                    <Card key={segment.id} variant="outlined" sx={{ p: 1.75 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={segment.speaker === 'examiner' ? 'Examiner' : 'Candidate'}
                            color={segment.speaker === 'examiner' ? 'info' : 'success'}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {segment.partId.toUpperCase()}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {segment.text}
                        </Typography>
                      </Stack>
                    </Card>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tx('pages.ielts.shared.empty_description')}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <InsightListCard
              title={tx('pages.ielts.shared.strengths')}
              items={result.strengths}
              emptyLabel={tx('pages.ielts.shared.no_strengths')}
            />

            <InsightListCard
              title={tx('pages.ielts.shared.weaknesses')}
              items={result.weaknesses}
              emptyLabel={tx('pages.ielts.shared.no_weaknesses')}
            />

            <InsightListCard
              title={tx('pages.ielts.shared.recommendations')}
              items={result.recommendations}
              emptyLabel="-"
            />

            <InsightListCard
              title={tx('pages.ielts.speaking.integrity_notes')}
              items={result.integrityNotes}
              emptyLabel="-"
            />

            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.speaking.examiner_summary')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {result.examinerSummary}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {fDate(attempt.completedAt || attempt.startedAt)}
                </Typography>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
