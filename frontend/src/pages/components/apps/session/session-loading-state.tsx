import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

export function SessionLoadingState() {
  return (
    <Box sx={{ minHeight: '100dvh', px: { xs: 2, md: 3 }, py: 3 }}>
      <Stack spacing={3}>
        <Skeleton variant="text" width={280} height={40} />
        <Skeleton variant="rounded" height={84} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
      </Stack>
    </Box>
  );
}
