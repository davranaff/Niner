import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsMyTestsView from 'src/sections/apps/student/my-tests/view';

export default function AppsMyTestsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.my_tests.document_title')}</title>
      </Helmet>
      <AppsMyTestsView />
    </>
  );
}
