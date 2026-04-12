import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

type AdminListSkeletonProps = {
  items?: number;
};

export function AdminListSkeleton({ items = 6 }: AdminListSkeletonProps) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: items }).map((_, index) => (
        <Grid key={index} item xs={12} md={6} xl={4}>
          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Skeleton variant="text" width="55%" height={30} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="75%" />
              </Stack>
              <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 1.5 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1.5 }} />
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
