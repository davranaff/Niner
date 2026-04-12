import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsSpeakingDetailsView from 'src/sections/apps/student/speaking/details/view';

export default function AppsSpeakingTestPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.speaking.test_document_title')}</title>
      </Helmet>
      <AppsSpeakingDetailsView />
    </>
  );
}
