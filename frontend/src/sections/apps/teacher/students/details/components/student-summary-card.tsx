// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// types
import type { TeacherStudentDetailsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type StudentSummaryCardProps = {
  data: TeacherStudentDetailsData;
};

export function StudentSummaryCard({ data }: StudentSummaryCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle1">{data.student.email}</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.teacher.target_band')}: {formatRoundedBand(data.student.targetBand)}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.teacher.latest_band')}: {formatRoundedBand(data.analytics.latestBand)}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.teacher.weak_module')}:{' '}
          {tx(`pages.ielts.${data.analytics.weakModule}.title`)}
        </Typography>
      </Stack>
    </Card>
  );
}
