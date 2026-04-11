// @mui
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type DashboardHeroProps = {
  title: string;
  description: string;
  demoBadge: string;
};

export function DashboardHero({ title, description, demoBadge }: DashboardHeroProps) {
  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={1} rowGap={1}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Chip label={demoBadge} size="small" color="default" variant="soft" sx={{ height: 26 }} />
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
        {description}
      </Typography>
    </Stack>
  );
}
