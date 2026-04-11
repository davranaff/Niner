import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function AppsTeacherDashboardSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Skeleton variant="text" width={260} height={40} />
        <Skeleton variant="text" width="min(100%, 560px)" height={24} />
      </Stack>

      <Grid container spacing={2.5}>
        {[0, 1, 2, 3].map((index) => (
          <Grid key={index} item xs={6} md={3}>
            <Skeleton variant="rounded" height={126} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12}>
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Stack>
  );
}
