import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsReadingCatalogView from 'src/sections/apps/student/reading/view';

export default function AppsReadingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.reading.document_title')}</title>
      </Helmet>
      <AppsReadingCatalogView />
    </>
  );
}
