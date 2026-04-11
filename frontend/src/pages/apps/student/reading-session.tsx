import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsReadingSessionView from 'src/sections/apps/student/reading/session/view';

export default function AppsReadingSessionPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.reading.session_document_title')}</title>
      </Helmet>
      <AppsReadingSessionView />
    </>
  );
}
