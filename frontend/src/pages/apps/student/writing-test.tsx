import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsWritingDetailsView from 'src/sections/apps/student/writing/details/view';

export default function AppsWritingTestPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.writing.test_document_title')}</title>
      </Helmet>
      <AppsWritingDetailsView />
    </>
  );
}
