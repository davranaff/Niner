import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminDashboardView from 'src/sections/apps/admin/dashboard/view';

export default function AppsAdminDashboardPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.dashboard.document_title')}</title>
      </Helmet>

      <AppsAdminDashboardView />
    </>
  );
}
