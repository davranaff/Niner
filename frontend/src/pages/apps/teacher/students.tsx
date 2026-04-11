import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsTeacherStudentsView from 'src/sections/apps/teacher/students/view';

export default function AppsTeacherStudentsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.teacher.students_document_title')}</title>
      </Helmet>
      <AppsTeacherStudentsView />
    </>
  );
}
