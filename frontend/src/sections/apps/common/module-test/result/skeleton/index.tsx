import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function AppsAttemptResultSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
      >
        <Stack spacing={1}>
          <Skeleton variant="text" width={240} height={40} />
          <Skeleton variant="text" width="min(100%, 580px)" height={24} />
        </Stack>
        <Skeleton variant="rounded" width={112} height={32} sx={{ borderRadius: 999 }} />
      </Stack>

      <Grid container spacing={2.5}>
        {[0, 1, 2, 3].map((index) => (
          <Grid key={index} item xs={6} md={3}>
            <Skeleton variant="rounded" height={124} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={380} sx={{ borderRadius: 2 }} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
