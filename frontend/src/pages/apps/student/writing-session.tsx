import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsWritingSessionView from 'src/sections/apps/student/writing/session/view';

export default function AppsWritingSessionPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.writing.session_document_title')}</title>
      </Helmet>
      <AppsWritingSessionView />
    </>
  );
}
