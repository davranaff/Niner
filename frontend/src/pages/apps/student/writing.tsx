import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsWritingCatalogView from 'src/sections/apps/student/writing/view';

export default function AppsWritingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.writing.document_title')}</title>
      </Helmet>
      <AppsWritingCatalogView />
    </>
  );
}
