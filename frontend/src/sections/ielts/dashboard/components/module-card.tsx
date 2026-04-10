// @mui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export type ModuleCardProps = {
  title: string;
  description: string;
  icon: string;
  colorKey: 'primary' | 'info' | 'success';
};

export function ModuleCard({ title, description, icon, colorKey }: ModuleCardProps) {
  const theme = useTheme();
  const palette = theme.palette[colorKey];

  return (
    <Card
      sx={{
        p: 3,
        height: 1,
        cursor: 'default',
        transition: theme.transitions.create(['box-shadow', 'transform']),
        '&:hover': {
          boxShadow: theme.customShadows.z24,
          transform: 'translateY(-4px)',
        },
        border: `1px solid ${alpha(palette.main, 0.12)}`,
        bgcolor: alpha(palette.main, 0.08),
      }}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(palette.main, 0.16),
            color: `${colorKey}.main`,
          }}
        >
          <Iconify icon={icon} width={32} />
        </Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </Stack>
    </Card>
  );
}
