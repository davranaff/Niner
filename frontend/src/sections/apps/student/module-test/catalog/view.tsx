import { useMemo } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useLocales } from 'src/locales';
import { useUrlListState, useUrlQueryState, stringParam } from 'src/hooks/use-url-query-state';
import { useFetch } from 'src/hooks/api';
import EmptyContent from 'src/components/empty-content';
import { AppsPageHeader } from 'src/pages/components/apps';
import { RouterLink } from 'src/routes/components';
import type { ActiveIeltsModule } from 'src/_mock/ielts';
import { useModuleTestsQuery } from 'src/sections/apps/common/api/use-apps';
import {
  fetchExamsMe,
  getModuleExams,
  toModuleAttemptHistoryItems,
} from 'src/sections/apps/common/module-test/utils/attempt-history';
import {
  getModuleAttemptPath,
  getModuleSessionPath,
  getModuleTestPath,
} from 'src/sections/apps/common/module-test/utils/module-meta';

import { ModuleTestCard } from './components/module-test-card';
import { AppsCatalogSkeleton } from './skeleton';

type AppsModuleCatalogViewProps = {
  module: ActiveIeltsModule;
};

export function AppsModuleCatalogView({ module }: AppsModuleCatalogViewProps) {
  const { tx } = useLocales();
  const listState = useUrlListState({ defaultPageSize: 6, defaultOrdering: 'featured' });
  const { values, setValues } = useUrlQueryState({
    status: stringParam('all'),
    difficulty: stringParam('all'),
  });

  const queryFilters = useMemo(
    () => ({
      page: listState.page,
      pageSize: listState.rowsPerPage,
      search: listState.search,
      status: values.status,
      difficulty: values.difficulty,
    }),
    [listState.page, listState.rowsPerPage, listState.search, values.difficulty, values.status]
  );

  const { data, isLoading } = useModuleTestsQuery(module, queryFilters);
  const examsQuery = useFetch(['module-attempt-history', module], () => fetchExamsMe(100));
  const moduleExams = useMemo(
    () => getModuleExams(examsQuery.data, module),
    [examsQuery.data, module]
  );

  const moduleTitle = tx(`pages.ielts.${module}.title`);
  const moduleDescription = tx(`pages.ielts.${module}.description`);

  return (
    <Container maxWidth="lg">
      <AppsPageHeader title={moduleTitle} description={moduleDescription} />

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            value={listState.search}
            onChange={(event) => listState.setSearch(event.target.value)}
            label={tx('pages.ielts.shared.search')}
          />

          <TextField
            select
            label={tx('pages.ielts.shared.status')}
            value={values.status}
            onChange={(event) => setValues({ status: event.target.value })}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
            <MenuItem value="not_started">{tx('pages.ielts.shared.status_not_started')}</MenuItem>
            <MenuItem value="in_progress">{tx('pages.ielts.shared.status_in_progress')}</MenuItem>
            <MenuItem value="completed">{tx('pages.ielts.shared.status_completed')}</MenuItem>
            <MenuItem value="terminated">{tx('pages.ielts.shared.status_terminated')}</MenuItem>
          </TextField>

          <TextField
            select
            label={tx('pages.ielts.shared.difficulty')}
            value={values.difficulty}
            onChange={(event) => setValues({ difficulty: event.target.value })}
            sx={{ minWidth: { md: 180 } }}
          >
            <MenuItem value="all">{tx('pages.ielts.shared.all_difficulties')}</MenuItem>
            <MenuItem value="foundation">{tx('pages.ielts.shared.difficulty_foundation')}</MenuItem>
            <MenuItem value="intermediate">
              {tx('pages.ielts.shared.difficulty_intermediate')}
            </MenuItem>
            <MenuItem value="advanced">{tx('pages.ielts.shared.difficulty_advanced')}</MenuItem>
          </TextField>
        </Stack>
      </Card>

      {isLoading ? <AppsCatalogSkeleton /> : null}

      {!isLoading && data ? (
        <>
          {data.results.length ? (
            <Grid container spacing={3}>
              {data.results.map((item) => {
                const attemptHistoryItems = toModuleAttemptHistoryItems(
                  module,
                  moduleExams,
                  item.id
                );

                return (
                  <Grid key={item.id} item xs={12} md={6} xl={4}>
                    <ModuleTestCard
                      item={item}
                      statusLabel={tx(`pages.ielts.shared.status_${item.status}`)}
                      difficultyLabel={tx(`pages.ielts.shared.difficulty_${item.difficulty}`)}
                      attemptsLabel={tx('pages.ielts.shared.attempts')}
                      bestBandLabel={tx('pages.ielts.shared.best_band')}
                      startLabel={tx('pages.ielts.shared.start')}
                      restartLabel={tx('pages.ielts.shared.restart')}
                      continueLabel={tx('pages.ielts.shared.continue')}
                      reviewLabel={tx('pages.ielts.shared.review_result')}
                      attemptHistoryLabel={tx('pages.ielts.shared.attempt_history')}
                      updatedLabel={tx('pages.ielts.shared.updated')}
                      attemptHistoryItems={attemptHistoryItems}
                      detailsHref={getModuleTestPath(module, item.id)}
                      sessionHref={
                        item.inProgressAttemptId ? getModuleSessionPath(module, item.id) : null
                      }
                      resultHref={
                        item.lastAttemptId ? getModuleAttemptPath(module, item.lastAttemptId) : null
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

          {data.count > listState.rowsPerPage ? (
            <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
              <Pagination
                page={listState.page}
                count={Math.ceil(data.count / listState.rowsPerPage)}
                onChange={(_event, value) => listState.setPage(value - 1)}
              />
            </Stack>
          ) : null}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {tx('pages.ielts.shared.total_results', { count: data.count })}
            </Typography>

            {data.results[0]?.id ? (
              <Button
                component={RouterLink}
                href={getModuleTestPath(module, data.results[0].id)}
                size="small"
              >
                {tx('pages.ielts.shared.open_featured')}
              </Button>
            ) : null}
          </Stack>
        </>
      ) : null}
    </Container>
  );
}
