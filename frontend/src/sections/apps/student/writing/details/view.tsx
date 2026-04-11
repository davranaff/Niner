import { useParams } from 'src/routes/hook';
import { ModuleTestDetailsView } from 'src/sections/apps/student/module-test/details/view';

export default function AppsWritingDetailsView() {
  const params = useParams();

  return <ModuleTestDetailsView module="writing" testId={String(params.testId || '')} />;
}
