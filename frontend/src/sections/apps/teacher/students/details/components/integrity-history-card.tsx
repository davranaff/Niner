// @mui
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// types
import type { TeacherStudentDetailsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type IntegrityHistoryCardProps = {
  data: TeacherStudentDetailsData;
};

export function IntegrityHistoryCard({ data }: IntegrityHistoryCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {tx('pages.ielts.teacher.integrity_history')}
      </Typography>

      <Stack spacing={1.5}>
        {data.integrityEvents.length ? (
          data.integrityEvents.map((event) => (
            <Alert key={event.id} severity="error">
              {event.description}
            </Alert>
          ))
        ) : (
          <Alert severity="success">{tx('pages.ielts.teacher.integrity_clear')}</Alert>
        )}
      </Stack>
    </Card>
  );
}
