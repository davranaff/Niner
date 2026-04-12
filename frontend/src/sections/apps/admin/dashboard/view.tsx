import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { RouterLink } from 'src/routes/components';

import { useLocales } from 'src/locales';
import { AppsPageHeader, InsightListCard, MetricCard } from 'src/pages/components/apps';
import { paths } from 'src/routes/paths';
import { AdminManualNote } from 'src/sections/apps/admin/components';
import { useAdminExamsListQuery } from 'src/sections/apps/admin/exams/api/use-exams-api';
import { resolveAdminExamStatus } from 'src/sections/apps/admin/exams/api/utils';
import { useAdminLessonCategoryListQuery, useAdminLessonListQuery } from 'src/sections/apps/admin/lessons/api/use-lessons-api';
import { useAdminListeningListQuery } from 'src/sections/apps/admin/listening/api/use-listening-api';
import { useAdminReadingListQuery } from 'src/sections/apps/admin/reading/api/use-reading-api';
import { useAdminWritingListQuery } from 'src/sections/apps/admin/writing/api/use-writing-api';

import { AppsAdminDashboardSkeleton } from './skeleton';

const DASHBOARD_BATCH_SIZE = 4;

export default function AppsAdminDashboardView() {
  const { tx } = useLocales();
  const readingQuery = useAdminReadingListQuery(1, DASHBOARD_BATCH_SIZE);
  const listeningQuery = useAdminListeningListQuery(1, DASHBOARD_BATCH_SIZE);
  const writingQuery = useAdminWritingListQuery(1, DASHBOARD_BATCH_SIZE);
  const categoriesQuery = useAdminLessonCategoryListQuery(1, DASHBOARD_BATCH_SIZE);
  const lessonsQuery = useAdminLessonListQuery(1, DASHBOARD_BATCH_SIZE);
  const readingExamsQuery = useAdminExamsListQuery('reading', 1, DASHBOARD_BATCH_SIZE);
  const writingExamsQuery = useAdminExamsListQuery('writing', 1, DASHBOARD_BATCH_SIZE);

  const loading =
    (readingQuery.isPending && !readingQuery.data) ||
    (listeningQuery.isPending && !listeningQuery.data) ||
    (writingQuery.isPending && !writingQuery.data) ||
    (categoriesQuery.isPending && !categoriesQuery.data) ||
    (lessonsQuery.isPending && !lessonsQuery.data) ||
    (readingExamsQuery.isPending && !readingExamsQuery.data) ||
    (writingExamsQuery.isPending && !writingExamsQuery.data);

  const readingTitles = readingQuery.data?.items.map((item) => item.title) ?? [];
  const listeningTitles = listeningQuery.data?.items.map((item) => item.title) ?? [];
  const writingTitles = writingQuery.data?.items.map((item) => item.title) ?? [];
  const categoryTitles = categoriesQuery.data?.items.map((item) => item.title) ?? [];
  const lessonTitles = lessonsQuery.data?.items.map((item) => item.title) ?? [];

  const examHighlights = useMemo(
    () => [
      ...(readingExamsQuery.data?.items ?? []).map(
        (item) =>
          `${tx('pages.admin.exams.kinds.reading')} #${item.id} · ${tx(
            `pages.admin.exams.status.${resolveAdminExamStatus(item)}`
          )}`
      ),
      ...(writingExamsQuery.data?.items ?? []).map(
        (item) =>
          `${tx('pages.admin.exams.kinds.writing')} #${item.id} · ${tx(
            `pages.admin.exams.status.${resolveAdminExamStatus(item)}`
          )}`
      ),
    ],
    [readingExamsQuery.data?.items, tx, writingExamsQuery.data?.items]
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <AppsAdminDashboardSkeleton />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.admin.dashboard.title')}
        description={tx('pages.admin.dashboard.description')}
      />

      <Stack spacing={3}>
        <AdminManualNote>{tx('pages.admin.dashboard.snapshot_note')}</AdminManualNote>

        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <MetricCard
              label={tx('pages.admin.dashboard.metrics.reading_tests')}
              value={String(readingQuery.data?.items.length ?? 0)}
              icon="solar:book-bold-duotone"
              color="primary"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              label={tx('pages.admin.dashboard.metrics.listening_tests')}
              value={String(listeningQuery.data?.items.length ?? 0)}
              icon="solar:headphones-round-bold-duotone"
              color="success"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              label={tx('pages.admin.dashboard.metrics.writing_tests')}
              value={String(writingQuery.data?.items.length ?? 0)}
              icon="solar:pen-bold-duotone"
              color="info"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              label={tx('pages.admin.dashboard.metrics.lessons')}
              value={String(lessonsQuery.data?.items.length ?? 0)}
              icon="solar:notebook-bookmark-bold-duotone"
              color="warning"
            />
          </Grid>
        </Grid>

        <Card variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tx('pages.admin.dashboard.quick_actions')}
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap">
              <Button component={RouterLink} href={paths.ielts.admin.reading} variant="contained">
                {tx('layout.nav.admin_reading')}
              </Button>
              <Button component={RouterLink} href={paths.ielts.admin.listening} variant="outlined">
                {tx('layout.nav.admin_listening')}
              </Button>
              <Button component={RouterLink} href={paths.ielts.admin.writing} variant="outlined">
                {tx('layout.nav.admin_writing')}
              </Button>
              <Button component={RouterLink} href={paths.ielts.admin.lessons} variant="outlined">
                {tx('layout.nav.admin_lessons')}
              </Button>
              <Button component={RouterLink} href={paths.ielts.admin.exams} variant="outlined">
                {tx('layout.nav.admin_exams')}
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.reading')}
              items={readingTitles}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.listening')}
              items={listeningTitles}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.writing')}
              items={writingTitles}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.categories')}
              items={categoryTitles}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.lessons')}
              items={lessonTitles}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <InsightListCard
              title={tx('pages.admin.dashboard.cards.exams')}
              items={examHighlights}
              emptyLabel={tx('pages.admin.shared.empty_title')}
            />
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
