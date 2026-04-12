import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminWritingDetailsView from 'src/sections/apps/admin/writing/details/view';

export default function AppsAdminWritingDetailsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.writing.detail_document_title')}</title>
      </Helmet>

      <AppsAdminWritingDetailsView />
    </>
  );
}
