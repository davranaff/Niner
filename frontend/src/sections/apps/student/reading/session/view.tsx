import { useParams } from 'src/routes/hook';
import { ObjectiveSessionView } from 'src/sections/apps/student/module-test/session/objective-view';

export default function AppsReadingSessionView() {
  const params = useParams();

  return <ObjectiveSessionView module="reading" testId={String(params.testId || '')} />;
}
