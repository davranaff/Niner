import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsReadingResultView from 'src/sections/apps/student/reading/result/view';

export default function AppsReadingResultPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.reading.result_document_title')}</title>
      </Helmet>
      <AppsReadingResultView />
    </>
  );
}
