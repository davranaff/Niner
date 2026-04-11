import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsTeacherDashboardView from 'src/sections/apps/teacher/dashboard/view';

export default function AppsTeacherDashboardPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.teacher.dashboard_document_title')}</title>
      </Helmet>
      <AppsTeacherDashboardView />
    </>
  );
}
