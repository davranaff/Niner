import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsTeacherAttemptDetailsView from 'src/sections/apps/teacher/attempt-details/view';

export default function AppsTeacherAttemptDetailsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.teacher.attempt_document_title')}</title>
      </Helmet>
      <AppsTeacherAttemptDetailsView />
    </>
  );
}
