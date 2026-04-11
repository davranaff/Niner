// @mui
import Box from '@mui/material/Box';
// routes
import { usePathname } from 'src/routes/hook';
import AppBreadcrumbs from 'src/components/app-breadcrumbs';
//
import Footer from './footer';
import Header from './header';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  const pathname = usePathname();

  const isHome = pathname === '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 1 }}>
      <Header />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ...(!isHome && {
            pt: { xs: 8, md: 10 },
          }),
        }}
      >
        <Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto', width: 1 }}>
          <AppBreadcrumbs />
        </Box>
        {children}
      </Box>

      <Footer />
    </Box>
  );
}
