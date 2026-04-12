// @mui
import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { AppsPageHeader, InsightListCard } from 'src/pages/components/apps';
// locales
import { useLocales } from 'src/locales';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// api
import { useStudentProfileQuery } from './api/use-student-profile-api';
import { ProfileMetricsGrid, StudentProfileSummaryCard } from './components';
import { AppsProfileSkeleton } from './skeleton';

// ----------------------------------------------------------------------

export default function AppsProfileView() {
  const { tx } = useLocales();
  const profileQuery = useStudentProfileQuery();

  if (profileQuery.isLoading) {
    return (
      <Container maxWidth="lg">
        <AppsProfileSkeleton />
      </Container>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning">{tx('pages.ielts.shared.empty_description')}</Alert>
      </Container>
    );
  }

  const { data } = profileQuery;
  const achievementItems = [
    `${tx('pages.ielts.dashboard.total_attempts')}: ${data.totalAttempts}`,
    `${tx('pages.ielts.dashboard.streak')}: ${data.studyStreak}`,
    `${tx('pages.ielts.dashboard.study_minutes')}: ${data.weeklyStudyMinutes}`,
  ];

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
            items={achievementItems}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.profile.recent_performance')}
            items={data.recentAttempts.map(
              (item) =>
                `${item.title} · ${
                  item.estimatedBand != null
                    ? formatRoundedBand(item.estimatedBand)
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
