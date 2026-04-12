import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import AppsAdminLessonsView from 'src/sections/apps/admin/lessons/view';

export default function AppsAdminLessonsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.admin.lessons.document_title')}</title>
      </Helmet>

      <AppsAdminLessonsView />
    </>
  );
}
