// @mui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
// components
import Iconify from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export type ModuleCardProps = {
  title: string;
  description: string;
  icon: string;
  colorKey: 'primary' | 'info' | 'success' | 'warning';
  href?: string;
  actionLabel?: string;
  badgeLabel?: string;
  disabled?: boolean;
};

export function ModuleCard({
  title,
  description,
  icon,
  colorKey,
  href,
  actionLabel,
  badgeLabel,
  disabled,
}: ModuleCardProps) {
  const theme = useTheme();
  const palette = theme.palette[colorKey];

  return (
    <Card
      sx={{
        p: 3,
        height: 1,
        cursor: disabled ? 'not-allowed' : 'default',
        transition: theme.transitions.create(['box-shadow', 'transform']),
        '&:hover': disabled
          ? undefined
          : {
              boxShadow: theme.customShadows.z24,
              transform: 'translateY(-4px)',
            },
        border: `1px solid ${alpha(palette.main, 0.12)}`,
        bgcolor: alpha(palette.main, 0.08),
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Stack spacing={2} sx={{ height: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
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

          {badgeLabel ? (
            <Chip size="small" variant="soft" color={colorKey} label={badgeLabel} />
          ) : null}
        </Stack>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
        {actionLabel && href && !disabled ? (
          <Button
            component={RouterLink}
            href={href}
            size="small"
            variant="contained"
            color="inherit"
            sx={{ mt: 'auto', alignSelf: 'flex-start' }}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Card>
  );
}
