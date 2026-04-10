import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import IeltsModulePlaceholderView from 'src/sections/ielts/module-placeholder/view';

export default function IeltsListeningPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.listening.document_title')}</title>
      </Helmet>
      <IeltsModulePlaceholderView
        title={tx('pages.ielts.listening.title')}
        description={tx('pages.ielts.listening.description')}
        placeholder={tx('pages.ielts.listening.placeholder')}
      />
    </>
  );
}
