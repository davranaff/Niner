import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsSpeakingCatalogView from 'src/sections/apps/student/speaking/view';

export default function AppsSpeakingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.speaking.document_title')}</title>
      </Helmet>
      <AppsSpeakingCatalogView />
    </>
  );
}
