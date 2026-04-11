// @mui
import Container from '@mui/material/Container';
// locales
import { useParams } from 'src/routes/hook';
// api
import { useAttemptIntegrityEventsQuery } from 'src/sections/apps/common/api/use-apps';
// components
import { AttemptResultView } from 'src/sections/apps/common/module-test/result/view';
import { MentorNoteCard } from './components';
import { AppsTeacherAttemptDetailsSkeleton } from './skeleton';

// ----------------------------------------------------------------------

export default function AppsTeacherAttemptDetailsView() {
  const params = useParams();
  const attemptId = String(params.attemptId || '');
  const integrityQuery = useAttemptIntegrityEventsQuery(attemptId);

  return (
    <>
      <AttemptResultView attemptId={attemptId} />

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {integrityQuery.isLoading ? (
          <AppsTeacherAttemptDetailsSkeleton />
        ) : (
          <MentorNoteCard hasIntegrityEvents={Boolean(integrityQuery.data?.length)} />
        )}
      </Container>
    </>
  );
}
