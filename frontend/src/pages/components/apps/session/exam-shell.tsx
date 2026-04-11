import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import GlobalStyles from '@mui/material/GlobalStyles';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

type ExamShellProps = {
  title: string;
  subtitle?: string;
  timerLabel: string;
  timerWarning?: boolean;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
  extraActions?: ReactNode;
};

const actionButtonSx: SxProps<Theme> = {
  minWidth: 44,
  px: 1.5,
  py: 0.875,
  borderRadius: 999,
  fontWeight: 700,
  color: 'common.black',
  borderColor: (theme) => alpha(theme.palette.common.black, 0.12),
  bgcolor: (theme) => alpha(theme.palette.common.black, 0.04),
  '&:hover': {
    borderColor: (theme) => alpha(theme.palette.common.black, 0.18),
    bgcolor: (theme) => alpha(theme.palette.common.black, 0.08),
  },
};

export function ExamShell({
  title,
  subtitle,
  timerLabel,
  timerWarning = false,
  onDecreaseFontSize,
  onIncreaseFontSize,
  submitLabel,
  onSubmit,
  children,
  extraActions,
}: ExamShellProps) {
  return (
    <>
      <GlobalStyles
        styles={(theme) => ({
          html: { height: '100%' },
          body: {
            height: '100%',
            overflow: 'hidden',
            backgroundColor: theme.palette.common.white,
          },
          '#root': { height: '100%' },
        })}
      />

      <Box
        sx={(theme) => ({
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.common.white,
          color: 'common.black',
        })}
      >
        <Box
          component="header"
          sx={(theme) => ({
            height: 72,
            px: { xs: 2, md: 2.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            borderBottom: `1px solid ${alpha(theme.palette.common.black, 0.12)}`,
            bgcolor: alpha(theme.palette.common.white, 0.96),
            backdropFilter: 'blur(10px)',
          })}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: 'common.black',
                flexShrink: 0,
              }}
            />

            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                variant="subtitle1"
                sx={{ fontWeight: 800, color: 'common.black' }}
              >
                {title}
              </Typography>
              {subtitle ? (
                <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Button variant="outlined" onClick={onDecreaseFontSize} sx={actionButtonSx}>
              A-
            </Button>
            <Button variant="outlined" onClick={onIncreaseFontSize} sx={actionButtonSx}>
              A+
            </Button>

            <Chip
              label={timerLabel}
              color={timerWarning ? 'error' : 'default'}
              variant={timerWarning ? 'filled' : 'outlined'}
              sx={(theme) => ({
                borderRadius: 999,
                fontWeight: 800,
                color: 'common.black',
                bgcolor: timerWarning
                  ? alpha(theme.palette.error.light, 0.24)
                  : alpha(theme.palette.common.black, 0.04),
                borderColor: timerWarning
                  ? alpha(theme.palette.error.main, 0.28)
                  : alpha(theme.palette.common.black, 0.12),
              })}
            />

            {extraActions}

            <Button
              variant="contained"
              color="error"
              onClick={onSubmit}
              sx={{ borderRadius: 999, px: 2.25, fontWeight: 800 }}
            >
              {submitLabel}
            </Button>
          </Stack>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            p: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
}
