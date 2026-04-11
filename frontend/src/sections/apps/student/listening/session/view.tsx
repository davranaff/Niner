import { useParams } from 'src/routes/hook';
import { ObjectiveSessionView } from 'src/sections/apps/student/module-test/session/objective-view';

export default function AppsListeningSessionView() {
  const params = useParams();

  return <ObjectiveSessionView module="listening" testId={String(params.testId || '')} />;
}
