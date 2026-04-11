import Box from '@mui/material/Box';

import AppBreadcrumbs from 'src/components/app-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

/**
 * Full-screen exam sessions are mounted outside DashboardLayout; keep breadcrumbs consistent.
 */
export default function SessionLayout({ children }: Props) {
  return (
    <>
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, md: 2.5 }, maxWidth: 1920, mx: 'auto' }}>
        <AppBreadcrumbs sx={{ mb: { xs: 1.5, md: 2 } }} />
      </Box>
      {children}
    </>
  );
}
