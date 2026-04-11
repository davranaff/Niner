import { useParams } from 'src/routes/hook';
import { ModuleTestDetailsView } from 'src/sections/apps/student/module-test/details/view';

export default function AppsListeningDetailsView() {
  const params = useParams();

  return <ModuleTestDetailsView module="listening" testId={String(params.testId || '')} />;
}
