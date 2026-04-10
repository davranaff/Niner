// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

/** Placeholder for future async dashboard data. */
export function IeltsDashboardSkeleton() {
  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Skeleton variant="text" width={280} height={40} />
          <Skeleton variant="text" width="min(100%, 560px)" height={24} />
        </Stack>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        <Stack direction="row" spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ flex: 1 }}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            </Box>
          ))}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Skeleton variant="rounded" height={200} sx={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rounded" height={200} sx={{ width: { md: 360 }, borderRadius: 2 }} />
        </Stack>
      </Stack>
    </Container>
  );
}
