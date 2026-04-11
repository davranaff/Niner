import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsTeacherStudentDetailsView from 'src/sections/apps/teacher/students/details/view';

export default function AppsTeacherStudentDetailsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.teacher.student_details_document_title')}</title>
      </Helmet>
      <AppsTeacherStudentDetailsView />
    </>
  );
}
