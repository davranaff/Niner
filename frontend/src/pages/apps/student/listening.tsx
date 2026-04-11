import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsListeningCatalogView from 'src/sections/apps/student/listening/view';

export default function AppsListeningPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.listening.document_title')}</title>
      </Helmet>
      <AppsListeningCatalogView />
    </>
  );
}
