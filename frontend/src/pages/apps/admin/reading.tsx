import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminReadingView from 'src/sections/apps/admin/reading/view';

export default function AppsAdminReadingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.reading.document_title')}</title>
      </Helmet>

      <AppsAdminReadingView />
    </>
  );
}
