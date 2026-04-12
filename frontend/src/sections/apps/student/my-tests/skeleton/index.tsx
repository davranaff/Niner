import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { TableSkeleton } from 'src/components/table';

export function AppsMyTestsSkeleton() {
  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((index) => (
          <Grid key={index} item xs={12} sm={6} md={3}>
            <Skeleton variant="rounded" height={168} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Skeleton variant="text" width={140} height={24} />
            <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: 999 }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5, flex: 1 }} />
            <Skeleton variant="rounded" width={180} height={56} sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="rounded" width={180} height={56} sx={{ borderRadius: 1.5 }} />
          </Stack>
        </Stack>
      </Card>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableBody>
              {[0, 1, 2, 3, 4].map((index) => (
                <TableSkeleton key={index} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2, py: 1.5 }}
        >
          <Skeleton variant="text" width={120} height={20} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={84} height={32} sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
