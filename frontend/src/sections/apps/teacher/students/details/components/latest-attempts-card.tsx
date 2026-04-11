// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// utils
import { fDate } from 'src/utils/format-time';
// types
import type { TeacherStudentDetailsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type LatestAttemptsCardProps = {
  data: TeacherStudentDetailsData;
};

export function LatestAttemptsCard({ data }: LatestAttemptsCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {tx('pages.ielts.teacher.latest_attempts')}
      </Typography>

      <Stack spacing={1.5}>
        {data.latestAttempts.map((item) => (
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
                  {tx(`pages.ielts.${item.attempt.module}.title`)} · {fDate(item.attempt.updatedAt)}
                </Typography>
              </Stack>

              <Button
                component={RouterLink}
                href={paths.ielts.teacher.attempt(item.attempt.id)}
                size="small"
                color="inherit"
              >
                {tx('pages.ielts.teacher.open_attempt')}
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
