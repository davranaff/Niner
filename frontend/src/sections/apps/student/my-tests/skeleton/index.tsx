import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { TableSkeleton } from 'src/components/table';

export function AppsMyTestsSkeleton() {
  return (
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

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
        <Skeleton variant="text" width={120} height={20} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={84} height={32} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
        </Stack>
      </Stack>
    </Card>
  );
}
