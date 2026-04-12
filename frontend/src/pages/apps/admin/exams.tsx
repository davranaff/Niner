import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminExamsView from 'src/sections/apps/admin/exams/view';

export default function AppsAdminExamsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.exams.document_title')}</title>
      </Helmet>

      <AppsAdminExamsView />
    </>
  );
}
