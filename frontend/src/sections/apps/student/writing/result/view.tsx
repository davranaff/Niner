import { useParams } from 'src/routes/hook';
import { AttemptResultView } from 'src/sections/apps/common/module-test/result/view';

export default function AppsWritingResultView() {
  const params = useParams();

  return <AttemptResultView attemptId={String(params.attemptId || '')} />;
}
