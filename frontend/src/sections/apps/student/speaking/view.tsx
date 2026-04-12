import { useState } from 'react';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

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
          {listQuery.data.items.length ? (
            <Grid container spacing={3}>
              {listQuery.data.items.map((item) => {
                const storedActiveExamId = getSpeakingActiveExamId(item.id);
                const latestActiveExam = findLatestUnfinishedSpeakingExamForTest(item.id, exams) ?? null;
                const canContinue = Boolean(storedActiveExamId || latestActiveExam);

                return (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <SpeakingTestCard
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
                            onClick={() => router.push(paths.ielts.speakingTest(String(item.id)))}
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
