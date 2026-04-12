import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminWritingView from 'src/sections/apps/admin/writing/view';

export default function AppsAdminWritingPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.writing.document_title')}</title>
      </Helmet>

      <AppsAdminWritingView />
    </>
  );
}
