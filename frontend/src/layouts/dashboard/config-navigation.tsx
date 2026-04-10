import { useMemo } from 'react';
// routes
import { paths } from 'src/routes/paths';
// locales
import { useLocales } from 'src/locales';
// components
import Iconify from 'src/components/iconify';
import SvgColor from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  dashboard: icon('ic_dashboard'),
  reading: <Iconify icon="solar:book-bold-duotone" width={24} />,
  listening: <Iconify icon="solar:headphones-round-bold-duotone" width={24} />,
  writing: <Iconify icon="solar:pen-bold-duotone" width={24} />,
  speaking: <Iconify icon="solar:microphone-3-bold-duotone" width={24} />,
};

// ----------------------------------------------------------------------

export function useNavData() {
  const { tx } = useLocales();

  const data = useMemo(
    () => [
      {
        subheader: tx('layout.nav.group'),
        items: [
          {
            title: tx('layout.nav.dashboard'),
            path: paths.dashboard,
            icon: ICONS.dashboard,
          },
          {
            title: tx('layout.nav.reading'),
            path: paths.ielts.reading,
            icon: ICONS.reading,
          },
          {
            title: tx('layout.nav.listening'),
            path: paths.ielts.listening,
            icon: ICONS.listening,
          },
          {
            title: tx('layout.nav.writing'),
            path: paths.ielts.writing,
            icon: ICONS.writing,
          },
          {
            title: tx('layout.nav.speaking'),
            path: '#',
            icon: ICONS.speaking,
            disabled: true,
            caption: tx('layout.nav.speaking_caption'),
          },
        ],
      },
    ],
    [tx]
  );

  return data;
}
