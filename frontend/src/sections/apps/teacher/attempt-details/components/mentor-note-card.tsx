// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type MentorNoteCardProps = {
  hasIntegrityEvents: boolean;
};

export function MentorNoteCard({ hasIntegrityEvents }: MentorNoteCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tx('pages.ielts.teacher.mentor_note')}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.teacher.mentor_note_placeholder')}
        </Typography>

        {hasIntegrityEvents ? (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {tx('pages.ielts.teacher.integrity_note')}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}
