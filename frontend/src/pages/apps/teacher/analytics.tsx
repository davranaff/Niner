import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsTeacherAnalyticsView from 'src/sections/apps/teacher/analytics/view';

export default function AppsTeacherAnalyticsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.teacher.analytics_document_title')}</title>
      </Helmet>
      <AppsTeacherAnalyticsView />
    </>
  );
}
