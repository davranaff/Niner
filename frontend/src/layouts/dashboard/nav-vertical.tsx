import { useEffect } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
// hooks
import { useResponsive } from 'src/hooks/use-responsive';
import { useLocales } from 'src/locales';
// hooks
import { useAppUserProfile } from 'src/hooks/use-app-user-profile';
// components
import Logo from 'src/components/logo';
import Scrollbar from 'src/components/scrollbar';
import { usePathname } from 'src/routes/hook';
import { NavSectionVertical } from 'src/components/nav-section';
//
import { NAV } from '../config-layout';
import { useNavData } from './config-navigation';
import { NavToggleButton } from '../_common';

// ----------------------------------------------------------------------

type Props = {
  openNav: boolean;
  onCloseNav: VoidFunction;
};

export default function NavVertical({ openNav, onCloseNav }: Props) {
  const { user } = useAppUserProfile();
  const { tx } = useLocales();

  const pathname = usePathname();

  const lgUp = useResponsive('up', 'lg');

  const navData = useNavData();

  let roleLabel = user.role;
  if (user.role === 'teacher') {
    roleLabel = tx('auth.shared.role_teacher');
  } else if (user.role === 'student') {
    roleLabel = tx('auth.shared.role_student');
  }

  const avatarInitial =
    user.displayName?.trim()?.charAt(0)?.toUpperCase() ||
    user.email?.trim()?.charAt(0)?.toUpperCase() ||
    '';

  useEffect(() => {
    if (openNav) {
      onCloseNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Logo variant="full" sx={{ mt: 3, ml: 4, mb: 1, width: 152, height: 'auto' }} />

        <NavSectionVertical
          data={navData}
          config={{
            currentRole: user?.role || 'student',
          }}
        />

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ px: 2, py: 2, mx: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={user.photoURL || undefined}
            alt={user.displayName}
            sx={(theme) => ({
              width: 52,
              height: 52,
              fontSize: theme.typography.pxToRem(20),
              fontWeight: theme.typography.fontWeightSemiBold,
              color: 'primary.darker',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
            })}
          >
            {avatarInitial}
          </Avatar>

          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" noWrap sx={{ width: 1, lineHeight: 1.35 }}>
              {user.displayName || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ width: 1, display: 'block' }}>
              {user.email || '—'}
            </Typography>
            <Chip label={roleLabel} size="small" color="primary" variant="soft" sx={{ height: 22, '& .MuiChip-label': { px: 1, typography: 'caption', fontWeight: 600 } }} />
          </Stack>
        </Stack>
      </Box>
    </Scrollbar>
  );

  return (
    <Box
      component="nav"
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: NAV.W_VERTICAL },
      }}
    >
      <NavToggleButton />

      {lgUp ? (
        <Stack
          sx={{
            height: 1,
            position: 'fixed',
            width: NAV.W_VERTICAL,
            borderRight: (theme) => `dashed 1px ${theme.palette.divider}`,
          }}
        >
          {renderContent}
        </Stack>
      ) : (
        <Drawer
          open={openNav}
          onClose={onCloseNav}
          PaperProps={{
            sx: {
              width: NAV.W_VERTICAL,
            },
          }}
        >
          {renderContent}
        </Drawer>
      )}
    </Box>
  );
}
