import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

export function AppsCatalogSkeleton() {
  return (
    <Grid container spacing={3}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Grid key={index} item xs={12} md={6} xl={4}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
  );
}
