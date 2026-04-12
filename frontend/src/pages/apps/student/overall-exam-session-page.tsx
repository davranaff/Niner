import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsOverallExamSessionView from 'src/sections/apps/student/overall/session/view';

export default function AppsOverallExamSessionPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.overall.session_document_title')}</title>
      </Helmet>
      <AppsOverallExamSessionView />
    </>
  );
}
