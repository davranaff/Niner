// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// utils
import { fDate } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// types
import type { TeacherDashboardData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type RecentAttemptsCardProps = {
  title: string;
  data: TeacherDashboardData;
};

export function RecentAttemptsCard({ title, data }: RecentAttemptsCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>

      <Stack spacing={1.5}>
        {data.recentAttempts.map((item) => (
          <Card key={item.attempt.id} variant="outlined" sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">{item.test.title}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.student.name} · {fDate(item.attempt.updatedAt)}
                </Typography>
              </Stack>

              <Typography variant="subtitle2">
                {item.result ? formatRoundedBand(item.result.estimatedBand) : '-'}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
