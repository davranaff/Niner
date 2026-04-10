import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import IeltsModulePlaceholderView from 'src/sections/ielts/module-placeholder/view';

export default function IeltsWritingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.writing.document_title')}</title>
      </Helmet>
      <IeltsModulePlaceholderView
        title={tx('pages.ielts.writing.title')}
        description={tx('pages.ielts.writing.description')}
        placeholder={tx('pages.ielts.writing.placeholder')}
      />
    </>
  );
}
