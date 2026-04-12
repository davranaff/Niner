import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsOverallExamView from 'src/sections/apps/student/overall/view';

export default function AppsOverallExamPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.overall.document_title')}</title>
      </Helmet>
      <AppsOverallExamView />
    </>
  );
}
