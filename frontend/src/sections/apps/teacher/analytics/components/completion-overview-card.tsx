// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// types
import type { TeacherAnalyticsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type CompletionOverviewCardProps = {
  data: TeacherAnalyticsData;
};

export function CompletionOverviewCard({ data }: CompletionOverviewCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {tx('pages.ielts.teacher.completion_stats')}
      </Typography>

      <Stack spacing={1}>
        <Typography variant="body2">
          {tx('pages.ielts.shared.status_completed')}: {data.completionVsTermination.completed}
        </Typography>

        <Typography variant="body2">
          {tx('pages.ielts.shared.status_terminated')}: {data.completionVsTermination.terminated}
        </Typography>
      </Stack>
    </Card>
  );
}
