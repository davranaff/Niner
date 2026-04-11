import { useState } from 'react';

import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
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
    rowsPerPage: listState.rowsPerPage,
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

  const goToPreviousPage = () => {
    listState.setPage(Math.max(0, listState.page - 2));
  };

  const goToNextPage = () => {
    listState.setPage(listState.page);
  };

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.reading.title')}
        description={tx('pages.ielts.reading.description')}
      />

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
          <TextField
            select
            label={tx('pages.ielts.shared.items_per_page')}
            value={String(listState.rowsPerPage)}
            onChange={(event) => listState.setRowsPerPage(Number(event.target.value))}
            sx={{ minWidth: { md: 180 } }}
          >
            {[6, 12, 24].map((pageSize) => (
              <MenuItem key={pageSize} value={pageSize}>
                {pageSize}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {listQuery.isLoading ? <ReadingCatalogSkeleton /> : null}

      {!listQuery.isLoading && listQuery.data ? (
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

          <Card variant="outlined" sx={{ p: 2.5, mt: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {tx('pages.ielts.shared.page_label', { page: listQuery.data.page })}
              </Typography>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={goToPreviousPage}
                  disabled={!listQuery.data.hasPreviousPage}
                >
                  {tx('pages.ielts.shared.previous_page')}
                </Button>

                <Button
                  variant="contained"
                  color="inherit"
                  onClick={goToNextPage}
                  disabled={!listQuery.data.hasNextPage}
                >
                  {tx('pages.ielts.shared.next_page')}
                </Button>
              </Stack>
            </Stack>
          </Card>
        </>
      ) : null}
    </Container>
  );
}
