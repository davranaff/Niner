import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function AppsTeacherAttemptDetailsSkeleton() {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="86%" height={20} />
        <Skeleton variant="rounded" height={36} sx={{ borderRadius: 1.5 }} />
      </Stack>
    </Card>
  );
}
