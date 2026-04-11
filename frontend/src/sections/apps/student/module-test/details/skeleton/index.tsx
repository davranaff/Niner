import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function AppsDetailSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width={280} height={40} />
          <Skeleton variant="text" width="min(100%, 620px)" height={24} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Skeleton variant="rounded" width={120} height={40} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" width={140} height={40} sx={{ borderRadius: 2 }} />
        </Stack>
      </Stack>

      <Skeleton variant="rounded" height={84} sx={{ borderRadius: 2 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} variant="rounded" height={118} sx={{ borderRadius: 2 }} />
            ))}
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
