import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsListeningSessionView from 'src/sections/apps/student/listening/session/view';

export default function AppsListeningSessionPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.listening.session_document_title')}</title>
      </Helmet>
      <AppsListeningSessionView />
    </>
  );
}
