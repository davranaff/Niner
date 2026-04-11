import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useLocales } from 'src/locales';
import { paths } from 'src/routes/paths';
import EmptyContent from 'src/components/empty-content';
import { useParams, useRouter } from 'src/routes/hook';
import { TableHeadCustom } from 'src/components/table';
import { AppsPageHeader, MetricCard } from 'src/pages/components/apps';

import { getReadingStoredResult } from '../api/utils';

function resolveReviewChipColor(isCorrect: boolean) {
  return isCorrect ? 'success' : 'error';
}

export default function AppsReadingResultView() {
  const { tx } = useLocales();
  const router = useRouter();
  const params = useParams();

  const attemptId = Number(params.attemptId || 0);
  const result = getReadingStoredResult(attemptId);

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

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.shared.result_title')}
        description={result.testTitle}
        action={
          <Button variant="outlined" color="inherit" onClick={() => router.push(paths.ielts.reading)}>
            {tx('pages.ielts.shared.return_to_reading')}
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
            label={tx('pages.ielts.shared.raw_score')}
            value={`${result.correctAnswers}/${result.totalQuestions}`}
            icon="solar:target-bold-duotone"
            color="success"
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

        <Grid item xs={6} md={3}>
          <MetricCard
            label={tx('pages.ielts.shared.finish_reason')}
            value={tx(`pages.ielts.shared.finish_${result.finishReason || 'completed'}`)}
            icon="solar:flag-2-bold-duotone"
            color={result.finishReason === 'time_is_up' ? 'warning' : 'success'}
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
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
              {result.answers.map((answer) => (
                <TableRow key={answer.id} hover>
                  <TableCell>{answer.questionNumber}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        {answer.questionType.replaceAll('_', ' ')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {answer.prompt}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{answer.userAnswer || '-'}</TableCell>
                  <TableCell>{answer.correctAnswer || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={resolveReviewChipColor(answer.isCorrect)}
                      label={tx(
                        `pages.ielts.shared.review_${answer.isCorrect ? 'correct' : 'incorrect'}`
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
