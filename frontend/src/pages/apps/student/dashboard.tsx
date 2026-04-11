import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsDashboardView from 'src/sections/apps/student/dashboard/view';

export default function AppsDashboardPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.document_title')}</title>
      </Helmet>
      <AppsDashboardView />
    </>
  );
}
