import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useLocales } from 'src/locales';
import EmptyContent from 'src/components/empty-content';
import { useParams, useRouter } from 'src/routes/hook';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';

import { getWritingStoredResult } from '../api/utils';

function resolveReviewChipColor(isChecked: boolean) {
  return isChecked ? 'success' : 'warning';
}

export default function AppsWritingResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();

  const attemptId = Number(params.attemptId || 0);
  const result = getWritingStoredResult(attemptId);

  if (!result) {
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

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={result.testTitle}
        action={
          <Button variant="outlined" color="inherit" onClick={() => router.push(paths.ielts.writing)}>
            {tx('pages.ielts.shared.return_to_writing')}
          </Button>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.estimated_band')}
            value={result.score != null ? result.score.toFixed(1) : '-'}
            icon="solar:medal-ribbon-star-bold-duotone"
            color="primary"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.task_count')}
            value={String(result.totalTasks)}
            icon="solar:checklist-minimalistic-bold-duotone"
            color="success"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.reviewed_tasks')}
            value={`${result.reviewedTasks}/${result.totalTasks}`}
            icon="solar:clipboard-check-bold-duotone"
            color="warning"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.time_spent')}
            value={result.timeSpent != null ? `${Math.round(result.timeSpent / 60)}m` : '-'}
            icon="solar:clock-circle-bold-duotone"
            color="info"
          />
        </Grid>
      </Grid>

      {!result.reviewedTasks ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {tx('pages.ielts.shared.evaluation_pending')}
        </Alert>
      ) : null}

      <Stack spacing={2.5}>
        {result.answers.map((answer) => (
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
                      label={`${tx('pages.ielts.shared.estimated_band')}: ${answer.score.toFixed(1)}`}
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
    </Container>
  );
}
