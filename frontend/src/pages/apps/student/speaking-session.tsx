import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsSpeakingSessionView from 'src/sections/apps/student/speaking/session/view';

export default function AppsSpeakingSessionPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.speaking.session_document_title')}</title>
      </Helmet>
      <AppsSpeakingSessionView />
    </>
  );
}
