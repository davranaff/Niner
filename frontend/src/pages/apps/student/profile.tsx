import { Helmet } from 'react-helmet-async';
import { useLocales } from 'src/locales';
import AppsProfileView from 'src/sections/apps/student/profile/view';

export default function AppsProfilePage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('pages.ielts.profile.document_title')}</title>
      </Helmet>
      <AppsProfileView />
    </>
  );
}
