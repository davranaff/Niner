import { Helmet } from 'react-helmet-async';

import { useLocales } from 'src/locales';
import { JwtConfirmView } from 'src/sections/auth/jwt';

// ----------------------------------------------------------------------

export default function ConfirmPage() {
  const { tx } = useLocales();

  return (
    <>
      <Helmet>
        <title>{tx('auth.confirm.title')}</title>
      </Helmet>

      <JwtConfirmView />
    </>
  );
}
