import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Iconify from 'src/components/iconify';

type MetricCardProps = {
  label: string;
  value: string;
  icon: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'error';
  helper?: string;
};

export function MetricCard({ label, value, icon, color, helper }: MetricCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        height: 1,
        borderColor: (theme) => alpha(theme.palette[color].main, 0.18),
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.05),
      }}
    >
      <Stack spacing={1.5}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (theme) => alpha(theme.palette[color].main, 0.14),
            color: `${color}.main`,
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>

        <Typography variant="h4">{value}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        {helper ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {helper}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}
