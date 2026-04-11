// @mui
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// utils
import { fDate } from 'src/utils/format-time';
// types
import type { TeacherStudentDetailsData } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type WritingSubmissionsCardProps = {
  data: TeacherStudentDetailsData;
};

export function WritingSubmissionsCard({ data }: WritingSubmissionsCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {tx('pages.ielts.teacher.writing_submissions')}
      </Typography>

      <Stack spacing={1.5}>
        {data.writingSubmissions.length ? (
          data.writingSubmissions.map((submission) => (
            <Card key={submission.id} variant="outlined" sx={{ p: 2.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
              >
                {fDate(submission.draftSavedAt)}
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {Object.values(submission.responses).join(' ').slice(0, 220)}...
              </Typography>
            </Card>
          ))
        ) : (
          <Alert severity="info">{tx('pages.ielts.shared.empty_title')}</Alert>
        )}
      </Stack>
    </Card>
  );
}
