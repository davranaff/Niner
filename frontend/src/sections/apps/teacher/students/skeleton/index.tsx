import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';

import { TableSkeleton } from 'src/components/table';

export function AppsTeacherStudentsSkeleton() {
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
    </Card>
  );
}
