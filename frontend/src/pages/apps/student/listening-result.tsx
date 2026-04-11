import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsListeningResultView from 'src/sections/apps/student/listening/result/view';

export default function AppsListeningResultPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.listening.result_document_title')}</title>
      </Helmet>
      <AppsListeningResultView />
    </>
  );
}
