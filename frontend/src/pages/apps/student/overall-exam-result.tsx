import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsOverallExamResultView from 'src/sections/apps/student/overall/result/view';

export default function AppsOverallExamResultPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.overall.result_document_title')}</title>
      </Helmet>
      <AppsOverallExamResultView />
    </>
  );
}
