import { useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useLocales } from 'src/locales';
import EmptyContent from 'src/components/empty-content';
import { useRouter } from 'src/routes/hook';
import { AppsPageHeader } from 'src/pages/components/apps';
import { useUrlListState } from 'src/hooks/use-url-query-state';

import {
  findLatestUnfinishedSpeakingExamForTest,
  getSpeakingActiveExamId,
  setSpeakingActiveExam,
  toSpeakingAttemptHistoryItems,
} from './api/utils';
import {
  useMySpeakingExamsQuery,
  useSpeakingListQuery,
  useStartSpeakingFlowMutation,
} from './api/use-speaking-api';
import { SPEAKING_LIST_DEFAULT_PAGE_SIZE } from './constants';
import { SpeakingTestCard } from './components';
import { SpeakingCatalogSkeleton } from './skeleton';

export default function AppsSpeakingCatalogView() {
  const { tx } = useLocales();
  const router = useRouter();
  const [startingTestId, setStartingTestId] = useState<number | null>(null);

  const listState = useUrlListState({
    defaultPageSize: SPEAKING_LIST_DEFAULT_PAGE_SIZE,
    defaultOrdering: 'created_at',
  });

  const listQuery = useSpeakingListQuery({
    page: listState.page,
    rowsPerPage: SPEAKING_LIST_DEFAULT_PAGE_SIZE,
  });
  const examsQuery = useMySpeakingExamsQuery();
  const startSpeakingFlowMutation = useStartSpeakingFlowMutation();

  const exams = examsQuery.data?.items ?? [];

  const totalStats = useMemo(
    () =>
      (listQuery.data?.items ?? []).reduce(
        (accumulator, item) => ({
          attempts: accumulator.attempts + item.attemptsCount,
          successful: accumulator.successful + item.successfulAttemptsCount,
          failed: accumulator.failed + item.failedAttemptsCount,
        }),
        { attempts: 0, successful: 0, failed: 0 }
      ),
    [listQuery.data?.items]
  );

  const handleStart = async (testId: number, examId?: number | null) => {
    setStartingTestId(testId);

    try {
      const exam = await startSpeakingFlowMutation.mutateAsync({
        testId,
        examId,
      });

      setSpeakingActiveExam(testId, exam.id);
      router.push(paths.ielts.speakingSession(String(testId)));
    } finally {
      setStartingTestId(null);
    }
  };

  const handleLoadMore = () => {
    listState.setPage(listState.page);
  };

  const showInitialSkeleton = listQuery.isPending && !listQuery.data;
  const loadMorePending = listQuery.isFetching && listQuery.isPlaceholderData;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.speaking.title')}
        description={tx('pages.ielts.speaking.description')}
      />

      {showInitialSkeleton ? <SpeakingCatalogSkeleton /> : null}

      {!showInitialSkeleton && listQuery.data ? (
        <>
          <Card
            variant="outlined"
            sx={(theme) => ({
              p: 2.5,
              mb: 3,
              borderColor: alpha(theme.palette.primary.main, 0.18),
              bgcolor: 'common.white',
            })}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" sx={{ color: 'primary.darker', fontWeight: 700 }}>
                  {tx('pages.ielts.speaking.title')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.attempts')}: {totalStats.attempts}
                </Typography>
              </Stack>

              <Stack spacing={0.25}>
                <Typography variant="h4" sx={{ color: 'primary.main', lineHeight: 1.15 }}>
                  {totalStats.successful}/{totalStats.failed}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.review_correct')}: {totalStats.successful} ·{' '}
                  {tx('pages.ielts.shared.review_incorrect')}: {totalStats.failed}
                </Typography>
              </Stack>
            </Stack>
          </Card>

          {listQuery.data.items.length ? (
            <Grid container spacing={3}>
              {listQuery.data.items.map((item) => {
                const storedActiveExamId = getSpeakingActiveExamId(item.id);
                const latestActiveExam = findLatestUnfinishedSpeakingExamForTest(item.id, exams) ?? null;
                const canContinue = Boolean(storedActiveExamId || latestActiveExam);
                const attemptHistoryItems = toSpeakingAttemptHistoryItems(item.id, exams);

                return (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <SpeakingTestCard
                      item={item}
                      activeLabel={tx('pages.ielts.shared.available_now')}
                      durationLabel={tx('pages.ielts.shared.duration')}
                      publishedAtLabel={tx('pages.ielts.shared.published_at')}
                      attemptsLabel={tx('pages.ielts.shared.attempts')}
                      successfulAttemptsLabel={tx('pages.ielts.shared.review_correct')}
                      failedAttemptsLabel={tx('pages.ielts.shared.review_incorrect')}
                      attemptHistoryLabel={tx('pages.ielts.shared.attempt_history')}
                      updatedLabel={tx('pages.ielts.shared.updated')}
                      attemptHistoryItems={attemptHistoryItems}
                      actions={
                        <Stack spacing={1}>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="primary"
                            onClick={() => router.push(paths.ielts.speakingTest(String(item.id)))}
                          >
                            {tx('pages.ielts.shared.details')}
                          </Button>

                          <LoadingButton
                            fullWidth
                            variant="contained"
                            color="primary"
                            loading={startingTestId === item.id}
                            onClick={() =>
                              handleStart(item.id, storedActiveExamId ?? latestActiveExam?.id)
                            }
                          >
                            {canContinue
                              ? tx('pages.ielts.shared.continue')
                              : tx('pages.ielts.shared.start')}
                          </LoadingButton>
                        </Stack>
                      }
                    />
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <EmptyContent
              filled
              title={tx('pages.ielts.shared.empty_title')}
              description={tx('pages.ielts.shared.empty_description')}
            />
          )}

          {listQuery.data.hasNextPage ? (
            <Card variant="outlined" sx={{ p: 2.5, mt: 3 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {tx('pages.ielts.shared.total_results', { count: listQuery.data.items.length })}
                </Typography>

                <LoadingButton
                  variant="contained"
                  color="primary"
                  loading={loadMorePending}
                  onClick={handleLoadMore}
                  sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
                >
                  {tx('pages.ielts.shared.load_more')}
                </LoadingButton>
              </Stack>
            </Card>
          ) : null}

          {!listQuery.data.hasNextPage && listQuery.data.items.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 3 }}>
              {tx('pages.ielts.shared.total_results', { count: listQuery.data.items.length })}
            </Typography>
          ) : null}
        </>
      ) : null}
    </Container>
  );
}
