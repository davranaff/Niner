import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsListeningDetailsView from 'src/sections/apps/student/listening/details/view';

export default function AppsListeningTestPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.listening.test_document_title')}</title>
      </Helmet>
      <AppsListeningDetailsView />
    </>
  );
}
