// @mui
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { AppsPageHeader, InsightListCard } from 'src/pages/components/apps';
// locales
import { useLocales } from 'src/locales';
// routes
import { useParams } from 'src/routes/hook';
// api
import { useTeacherStudentQuery } from 'src/sections/apps/common/api/use-apps';
import {
  IntegrityHistoryCard,
  LatestAttemptsCard,
  StudentMetricsGrid,
  StudentSummaryCard,
  WritingSubmissionsCard,
} from './components';
import { AppsTeacherStudentDetailsSkeleton } from './skeleton';

// ----------------------------------------------------------------------

export default function AppsTeacherStudentDetailsView() {
  const { tx } = useLocales();
  const params = useParams();
  const studentId = String(params.studentId || '');
  const detailsQuery = useTeacherStudentQuery(studentId);

  if (detailsQuery.isLoading || !detailsQuery.data) {
    return (
      <Container maxWidth="lg">
        <AppsTeacherStudentDetailsSkeleton />
      </Container>
    );
  }

  const { data } = detailsQuery;

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={data.student.name}
        description={tx('pages.ielts.teacher.student_details_description')}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StudentSummaryCard data={data} />
        </Grid>

        <Grid item xs={12} md={8}>
          <StudentMetricsGrid data={data} />
        </Grid>

        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.shared.strengths')}
            items={data.analytics.strengths}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InsightListCard
            title={tx('pages.ielts.shared.weaknesses')}
            items={data.analytics.weaknesses}
            emptyLabel={tx('pages.ielts.shared.empty_title')}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <LatestAttemptsCard data={data} />
        </Grid>

        <Grid item xs={12} md={6}>
          <IntegrityHistoryCard data={data} />
        </Grid>

        <Grid item xs={12}>
          <WritingSubmissionsCard data={data} />
        </Grid>
      </Grid>
    </Container>
  );
}
