import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
// eslint-disable-next-line import/no-named-as-default
import AppsAssignmentsView from 'src/sections/apps/student/assignments/view';

export default function AppsAssignmentsPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.assignments.document_title')}</title>
      </Helmet>
      <AppsAssignmentsView />
    </>
  );
}
