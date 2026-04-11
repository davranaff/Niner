import type { SxProps, Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';

import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { useBreadcrumbLinks } from 'src/hooks/use-breadcrumb-links';

// ----------------------------------------------------------------------

type Props = {
  sx?: SxProps<Theme>;
};

export default function AppBreadcrumbs({ sx }: Props) {
  const links = useBreadcrumbLinks();

  return (
    <Box sx={{ mb: { xs: 2, md: 2.5 }, ...sx }}>
      <CustomBreadcrumbs links={links} />
    </Box>
  );
}
