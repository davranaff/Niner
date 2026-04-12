import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminListeningDetailsView from 'src/sections/apps/admin/listening/details/view';

export default function AppsAdminListeningDetailsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.listening.detail_document_title')}</title>
      </Helmet>

      <AppsAdminListeningDetailsView />
    </>
  );
}
