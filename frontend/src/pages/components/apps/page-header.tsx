import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type AppsPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AppsPageHeader({ title, description, action }: AppsPageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Stack spacing={1}>
        <Typography variant="h4">{title}</Typography>
        {description ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 760 }}>
            {description}
          </Typography>
        ) : null}
      </Stack>

      {action}
    </Stack>
  );
}
