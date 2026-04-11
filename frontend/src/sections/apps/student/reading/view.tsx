import { useState } from 'react';

import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useLocales } from 'src/locales';
import EmptyContent from 'src/components/empty-content';
import { useRouter } from 'src/routes/hook';
import { AppsPageHeader } from 'src/pages/components/apps';
import { useUrlListState } from 'src/hooks/use-url-query-state';

import {
  findLatestUnfinishedReadingExamForTest,
  getReadingActiveExamId,
  READING_LIST_DEFAULT_PAGE_SIZE,
  setReadingActiveExam,
} from './api/utils';
import {
  useMyReadingExamsQuery,
  useReadingListQuery,
  useStartReadingFlowMutation,
} from './api/use-reading-api';
import { ReadingTestCard } from './components';
import { ReadingCatalogSkeleton } from './skeleton';

export default function AppsReadingCatalogView() {
  const { tx } = useLocales();
  const router = useRouter();
  const [startingTestId, setStartingTestId] = useState<number | null>(null);

  const listState = useUrlListState({
    defaultPageSize: READING_LIST_DEFAULT_PAGE_SIZE,
    defaultOrdering: 'created_at',
  });

  const listQuery = useReadingListQuery({
    page: listState.page,
    rowsPerPage: READING_LIST_DEFAULT_PAGE_SIZE,
  });
  const examsQuery = useMyReadingExamsQuery();
  const startReadingFlowMutation = useStartReadingFlowMutation();

  const exams = examsQuery.data?.items ?? [];

  const handleStart = async (testId: number, examId?: number | null) => {
    setStartingTestId(testId);

    try {
      const exam = await startReadingFlowMutation.mutateAsync({
        testId,
        examId,
      });

      setReadingActiveExam(testId, exam.id);
      router.push(paths.ielts.readingSession(String(testId)));
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
        title={tx('pages.ielts.reading.title')}
        description={tx('pages.ielts.reading.description')}
      />

      {showInitialSkeleton ? <ReadingCatalogSkeleton /> : null}

      {!showInitialSkeleton && listQuery.data ? (
        <>
          {listQuery.data.items.length ? (
            <Grid container spacing={3}>
              {listQuery.data.items.map((item) => {
                const storedActiveExamId = getReadingActiveExamId(item.id);
                const latestActiveExam =
                  findLatestUnfinishedReadingExamForTest(item.id, exams) ?? null;
                const canContinue = Boolean(storedActiveExamId || latestActiveExam);

                return (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <ReadingTestCard
                      item={item}
                      activeLabel={tx('pages.ielts.shared.available_now')}
                      durationLabel={tx('pages.ielts.shared.duration')}
                      publishedAtLabel={tx('pages.ielts.shared.published_at')}
                      actions={
                        <>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="inherit"
                            onClick={() => router.push(paths.ielts.readingTest(String(item.id)))}
                          >
                            {tx('pages.ielts.shared.details')}
                          </Button>

                          <LoadingButton
                            fullWidth
                            variant="contained"
                            color="inherit"
                            loading={startingTestId === item.id}
                            onClick={() =>
                              handleStart(item.id, storedActiveExamId ?? latestActiveExam?.id)
                            }
                          >
                            {canContinue
                              ? tx('pages.ielts.shared.continue')
                              : tx('pages.ielts.shared.start')}
                          </LoadingButton>
                        </>
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
                  color="inherit"
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
