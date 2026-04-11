import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

type ExamPanelProps = {
  title: string;
  meta?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
};

export function ExamPanel({ title, meta, actions, footer, children, sx, bodySx }: ExamPanelProps) {
  return (
    <Box
      sx={[
        (theme) => ({
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.common.black, 0.12)}`,
          bgcolor: alpha(theme.palette.common.white, 0.96),
          backdropFilter: 'blur(10px)',
          boxShadow: theme.customShadows.z8,
          overflow: 'hidden',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={(theme) => ({
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.common.black, 0.1)}`,
          bgcolor: alpha(theme.palette.common.black, 0.025),
        })}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap variant="subtitle2" sx={{ fontWeight: 800, color: 'common.black' }}>
            {title}
          </Typography>
          {meta ? (
            <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>
              {meta}
            </Typography>
          ) : null}
        </Box>

        {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
      </Box>

      <Box
        sx={[
          {
            px: 2,
            py: 2,
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
          },
          ...(Array.isArray(bodySx) ? bodySx : [bodySx]),
        ]}
      >
        {children}
      </Box>

      {footer ? (
        <Box
          sx={(theme) => ({
            px: 2,
            py: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.common.black, 0.1)}`,
            bgcolor: alpha(theme.palette.common.black, 0.02),
          })}
        >
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
