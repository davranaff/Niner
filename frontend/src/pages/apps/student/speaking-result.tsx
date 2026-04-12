import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsSpeakingResultView from 'src/sections/apps/student/speaking/result/view';

export default function AppsSpeakingResultPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.speaking.result_document_title')}</title>
      </Helmet>
      <AppsSpeakingResultView />
    </>
  );
}
