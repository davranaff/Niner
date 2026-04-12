// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// types
import type { StudentProfileData } from '../api/types';

// ----------------------------------------------------------------------

type StudentProfileSummaryCardProps = {
  data: StudentProfileData;
};

export function StudentProfileSummaryCard({ data }: StudentProfileSummaryCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">{data.studentName}</Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {data.studentEmail}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.profile.target_band')}: {formatRoundedBand(data.targetBand)}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.profile.current_band')}: {formatRoundedBand(data.estimatedOverallBand)}
        </Typography>
      </Stack>
    </Card>
  );
}
