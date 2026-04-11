import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsWritingResultView from 'src/sections/apps/student/writing/result/view';

export default function AppsWritingResultPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.writing.result_document_title')}</title>
      </Helmet>
      <AppsWritingResultView />
    </>
  );
}
