// @mui
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { AppsPageHeader, InsightListCard } from 'src/pages/components/apps';
// locales
import { useLocales } from 'src/locales';
// api
import { useTeacherAnalyticsQuery } from 'src/sections/apps/common/api/use-apps';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
import { AnalyticsMetricsGrid, AnalyticsProgressCard, CompletionOverviewCard } from './components';
import { AppsTeacherAnalyticsSkeleton } from './skeleton';

// ----------------------------------------------------------------------

export default function AppsTeacherAnalyticsView() {
  const { tx } = useLocales();
  const analyticsQuery = useTeacherAnalyticsQuery();

  if (analyticsQuery.isLoading || !analyticsQuery.data) {
    return (
      <Container maxWidth="lg">
        <AppsTeacherAnalyticsSkeleton />
      </Container>
    );
  }

  const { data } = analyticsQuery;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.teacher.analytics_title')}
        description={tx('pages.ielts.teacher.analytics_description')}
      />

      <AnalyticsMetricsGrid data={data} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <AnalyticsProgressCard
            title={tx('pages.ielts.teacher.common_weak_areas')}
            items={data.weakAreas}
            translateModuleLabel
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <AnalyticsProgressCard
            title={tx('pages.ielts.teacher.question_type_issues')}
            items={data.questionTypeIssues}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.teacher.at_risk_students')}
            items={data.atRiskStudents.map(
              (item) => `${item.studentName} · ${formatRoundedBand(item.latestBand)}`
            )}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CompletionOverviewCard data={data} />
        </Grid>
      </Grid>
    </Container>
  );
}
