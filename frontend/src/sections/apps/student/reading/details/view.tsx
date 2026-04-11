import { useParams } from 'src/routes/hook';
import { ModuleTestDetailsView } from 'src/sections/apps/student/module-test/details/view';

export default function AppsReadingDetailsView() {
  const params = useParams();

  return <ModuleTestDetailsView module="reading" testId={String(params.testId || '')} />;
}
