import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsReadingDetailsView from 'src/sections/apps/student/reading/details/view';

export default function AppsReadingTestPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.reading.test_document_title')}</title>
      </Helmet>
      <AppsReadingDetailsView />
    </>
  );
}
