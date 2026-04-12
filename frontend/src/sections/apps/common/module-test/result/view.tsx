import { useMemo } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { alpha } from '@mui/material/styles';

import {
  AppsPageHeader,
  InsightListCard,
  AppsStatusChip,
  MetricCard,
} from 'src/pages/components/apps';
import { useLocales } from 'src/locales';
import { TableHeadCustom } from 'src/components/table';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

import {
  useAttemptIntegrityEventsQuery,
  useAttemptQuery,
  useAttemptResultQuery,
} from '../../api/use-apps';
import { AppsAttemptResultSkeleton } from './skeleton';

type AttemptResultViewProps = {
  attemptId: string;
};

function resolveReviewChipColor(status: string) {
  if (status === 'correct') return 'success';
  if (status === 'partial') return 'warning';
  return 'error';
}

export function AttemptResultView({ attemptId }: AttemptResultViewProps) {
  const { tx } = useLocales();

  const attemptQuery = useAttemptQuery(attemptId);
  const resultQuery = useAttemptResultQuery(attemptId);
  const integrityQuery = useAttemptIntegrityEventsQuery(attemptId);

  const data = useMemo(() => {
    if (!attemptQuery.data || !resultQuery.data) return null;
    return {
      attempt: attemptQuery.data,
      result: resultQuery.data,
      integrityEvents: integrityQuery.data || [],
    };
  }, [attemptQuery.data, integrityQuery.data, resultQuery.data]);

  if (!data || attemptQuery.isLoading || resultQuery.isLoading) {
    return (
      <Container maxWidth="lg">
        <AppsAttemptResultSkeleton />
      </Container>
    );
  }

  const criteriaRows = data.result.writingCriteria
    ? ([
        ['Task Achievement / Response', data.result.writingCriteria.taskAchievement],
        ['Coherence & Cohesion', data.result.writingCriteria.coherence],
        ['Lexical Resource', data.result.writingCriteria.lexicalResource],
        ['Grammar Range & Accuracy', data.result.writingCriteria.grammarRangeAccuracy],
      ] as Array<[string, number]>)
    : [];

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={data.result.summary}
        action={
          <AppsStatusChip
            status={data.attempt.status}
            label={tx(`pages.ielts.shared.status_${data.attempt.status}`)}
          />
        }
      />

      {data.attempt.finishReason === 'tab_switch' ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.integrity_terminated')}
        </Alert>
      ) : null}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.estimated_band')}
            value={formatRoundedBand(data.result.estimatedBand)}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.raw_score')}
            value={
              data.attempt.module === 'writing'
                ? '-'
                : `${data.result.rawScore}/${data.result.totalQuestions}`
            }
            icon="solar:target-bold-duotone"
            color="success"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.time_spent')}
            value={`${Math.round(data.result.timeSpentSec / 60)}m`}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.finish_reason')}
            value={tx(`pages.ielts.shared.finish_${data.result.finishReason}`)}
            icon="solar:flag-2-bold-duotone"
            color={data.attempt.status === 'terminated' ? 'error' : 'warning'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {data.attempt.module !== 'writing' ? (
            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                {tx('pages.ielts.shared.section_breakdown')}
              </Typography>

              <Stack spacing={2}>
                {data.result.sectionBreakdown.map((section) => (
                  <Stack key={section.sectionId} spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{section.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {section.correct}/{section.total}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={section.accuracy}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                      }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Card>
          ) : null}

          {criteriaRows.length ? (
            <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                {tx('pages.ielts.shared.criteria_breakdown')}
              </Typography>

              <Stack spacing={2}>
                {criteriaRows.map(([label, value]) => (
                  <Stack key={label} spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatRoundedBand(value)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(value / 9) * 100}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12),
                      }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Card>
          ) : null}

          {data.attempt.module !== 'writing' ? (
            <Card variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
              <Stack spacing={2} sx={{ p: 3, pb: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.shared.answer_review')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.answer_review_description')}
                </Typography>
              </Stack>

              <TableContainer sx={{ minWidth: 760 }}>
                <Table size="small">
                  <TableHeadCustom
                    headLabel={[
                      { id: 'number', label: '#' },
                      { id: 'type', label: tx('pages.ielts.shared.question_type') },
                      { id: 'userAnswer', label: tx('pages.ielts.shared.your_answer') },
                      { id: 'correctAnswer', label: tx('pages.ielts.shared.correct_answer') },
                      { id: 'status', label: tx('pages.ielts.shared.status') },
                    ]}
                  />
                  <TableBody>
                    {data.result.answerReview.map((row) => (
                      <TableRow key={row.questionId} hover>
                        <TableCell>{row.number}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">{row.type.replaceAll('_', ' ')}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {row.prompt}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{row.userAnswer}</TableCell>
                        <TableCell>{row.correctAnswer}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="soft"
                            color={resolveReviewChipColor(row.status)}
                            label={tx(`pages.ielts.shared.review_${row.status}`)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tx('pages.ielts.shared.essay_preview')}
                </Typography>
                {Object.entries(data.result.essayPreview || {}).map(([promptId, content]) => (
                  <Card key={promptId} variant="outlined" sx={{ p: 2.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}
                    >
                      {content}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <InsightListCard
              title={tx('pages.ielts.shared.strengths')}
              items={data.result.strengths}
              emptyLabel={tx('pages.ielts.shared.no_strengths')}
            />
            <InsightListCard
              title={tx('pages.ielts.shared.weaknesses')}
              items={data.result.weaknesses}
              emptyLabel={tx('pages.ielts.shared.no_weaknesses')}
            />
            <InsightListCard
              title={tx('pages.ielts.shared.recommendations')}
              items={data.result.recommendations.map(
                (item) => `${item.title}: ${item.description}`
              )}
              emptyLabel={tx('pages.ielts.shared.no_recommendations')}
            />

            {data.integrityEvents.length ? (
              <Card variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                  {tx('pages.ielts.shared.integrity_events')}
                </Typography>

                <Stack spacing={1.5}>
                  {data.integrityEvents.map((event) => (
                    <Alert key={event.id} severity="error">
                      {event.description}
                    </Alert>
                  ))}
                </Stack>
              </Card>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
