// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// types
import type { StudentProfileData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type StudentProfileSummaryCardProps = {
  data: StudentProfileData;
};

export function StudentProfileSummaryCard({ data }: StudentProfileSummaryCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">{data.student.name}</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {data.student.email}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.profile.target_band')}: {data.student.targetBand.toFixed(1)}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.profile.current_band')}: {data.estimatedOverallBand.toFixed(1)}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.profile.active_plan')}: {data.student.activePlan.name}
        </Typography>
      </Stack>
    </Card>
  );
}
