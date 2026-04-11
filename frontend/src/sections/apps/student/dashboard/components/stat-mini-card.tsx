// @mui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

type StatMiniCardProps = {
  label: string;
  value: string;
  icon: string;
  colorKey: 'primary' | 'info' | 'success' | 'warning';
  hint?: string;
};

export function StatMiniCard({ label, value, icon, colorKey, hint }: StatMiniCardProps) {
  const theme = useTheme();
  const palette = theme.palette[colorKey];

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        height: 1,
        borderColor: alpha(palette.main, 0.2),
        bgcolor: alpha(palette.main, 0.04),
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(palette.main, 0.14),
              color: `${colorKey}.main`,
            }}
          >
            <Iconify icon={icon} width={22} />
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" sx={{ color: 'success.main', display: 'block', mt: -0.5 }}>
            {hint}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}
