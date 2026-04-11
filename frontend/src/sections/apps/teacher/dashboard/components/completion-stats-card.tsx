// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// types
import type { TeacherDashboardData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type CompletionStatsCardProps = {
  data: TeacherDashboardData;
};

export function CompletionStatsCard({ data }: CompletionStatsCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {tx('pages.ielts.teacher.completion_stats')}
      </Typography>

      <Stack spacing={1}>
        <Typography variant="body2">
          {tx('pages.ielts.shared.status_completed')}: {data.completionStats.completed}
        </Typography>

        <Typography variant="body2">
          {tx('pages.ielts.shared.status_terminated')}: {data.completionStats.terminated}
        </Typography>

        <Typography variant="body2">
          {tx('pages.ielts.shared.status_in_progress')}: {data.completionStats.inProgress}
        </Typography>
      </Stack>
    </Card>
  );
}
