import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import IeltsModulePlaceholderView from 'src/sections/ielts/module-placeholder/view';

export default function IeltsReadingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.reading.document_title')}</title>
      </Helmet>
      <IeltsModulePlaceholderView
        title={tx('pages.ielts.reading.title')}
        description={tx('pages.ielts.reading.description')}
        placeholder={tx('pages.ielts.reading.placeholder')}
      />
    </>
  );
}
