import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function AppsTeacherStudentDetailsSkeleton() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="text" width="min(100%, 520px)" height={24} />
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {[0, 1, 2, 3].map((index) => (
              <Grid key={index} item xs={6} md={3}>
                <Skeleton variant="rounded" height={126} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    </Stack>
  );
}
