import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

export function AdminDetailSkeleton() {
  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="35%" height={34} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="60%" />
        </Stack>
      </Card>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Skeleton variant="text" width="30%" height={28} />
            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1.5 }} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
