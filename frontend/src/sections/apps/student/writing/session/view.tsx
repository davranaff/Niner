import { useParams } from 'src/routes/hook';
import { WritingSessionView } from 'src/sections/apps/student/module-test/session/writing-view';

export default function AppsWritingSessionView() {
  const params = useParams();

  return <WritingSessionView testId={String(params.testId || '')} />;
}
