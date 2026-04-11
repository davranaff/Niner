// @mui
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { AppsPageHeader, InsightListCard } from 'src/pages/components/apps';
// locales
import { useLocales } from 'src/locales';
// api
import { useStudentProfileQuery } from 'src/sections/apps/common/api/use-apps';
import { ProfileMetricsGrid, StudentProfileSummaryCard } from './components';
import { AppsProfileSkeleton } from './skeleton';

// ----------------------------------------------------------------------

export default function AppsProfileView() {
  const { tx } = useLocales();
  const profileQuery = useStudentProfileQuery();

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <Container maxWidth="lg">
        <AppsProfileSkeleton />
      </Container>
    );
  }

  const { data } = profileQuery;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.profile.title')}
        description={tx('pages.ielts.profile.description')}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StudentProfileSummaryCard data={data} />
        </Grid>

        <Grid item xs={12} md={8}>
          <ProfileMetricsGrid data={data} />
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.profile.achievements')}
            items={data.achievements}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.profile.recent_performance')}
            items={data.recentAttempts.map(
              (item) =>
                `${item.test.title} · ${
                  item.result
                    ? item.result.estimatedBand.toFixed(1)
                    : tx('pages.ielts.shared.status_in_progress')
                }`
            )}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>
      </Grid>
    </Container>
  );
}
