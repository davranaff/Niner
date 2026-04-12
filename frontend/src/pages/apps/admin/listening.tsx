import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminListeningView from 'src/sections/apps/admin/listening/view';

export default function AppsAdminListeningPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.listening.document_title')}</title>
      </Helmet>

      <AppsAdminListeningView />
    </>
  );
}
