import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminReadingDetailsView from 'src/sections/apps/admin/reading/details/view';

export default function AppsAdminReadingDetailsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.reading.detail_document_title')}</title>
      </Helmet>

      <AppsAdminReadingDetailsView />
    </>
  );
}
