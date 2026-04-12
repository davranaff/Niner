// @mui
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
// locales
import { useLocales } from 'src/locales';
// routes
import { RouterLink } from 'src/routes/components';
import { paths } from 'src/routes/paths';
// utils
import { fDate } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
// table
import { TableHeadCustom, TableNoData, TablePaginationCustom } from 'src/components/table';
import { AppsStatusChip } from 'src/pages/components/apps';
// types
import type { PaginatedTeacherStudents } from 'src/sections/apps/common/api/types';

// ----------------------------------------------------------------------

type StudentsTableProps = {
  data: PaginatedTeacherStudents;
  page: number;
  rowsPerPage: number;
  dense: boolean;
  onPageChange: (_event: unknown, nextPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function StudentsTable({
  data,
  page,
  rowsPerPage,
  dense,
  onPageChange,
  onRowsPerPageChange,
}: StudentsTableProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined">
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHeadCustom
            headLabel={[
              { id: 'student', label: tx('pages.ielts.teacher.student_name') },
              { id: 'target', label: tx('pages.ielts.teacher.target_band') },
              { id: 'latest', label: tx('pages.ielts.teacher.latest_band') },
              { id: 'attempts', label: tx('pages.ielts.shared.attempts') },
              { id: 'weak', label: tx('pages.ielts.teacher.weak_module') },
              { id: 'last', label: tx('pages.ielts.teacher.last_activity') },
              { id: 'integrity', label: tx('pages.ielts.teacher.integrity') },
              { id: 'action', label: '' },
            ]}
          />

          <TableBody>
            {data.results.map((item) => (
              <TableRow key={item.studentId} hover>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2">{item.studentName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.studentEmail}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>{formatRoundedBand(item.targetBand)}</TableCell>
                <TableCell>{formatRoundedBand(item.latestBand)}</TableCell>
                <TableCell>{item.attemptsCount}</TableCell>
                <TableCell>{tx(`pages.ielts.${item.weakModule}.title`)}</TableCell>
                <TableCell>{fDate(item.lastActivity)}</TableCell>

                <TableCell>
                  {item.integrityFlag ? (
                    <AppsStatusChip
                      status="terminated"
                      label={tx('pages.ielts.teacher.integrity_flagged')}
                    />
                  ) : (
                    <AppsStatusChip
                      status="completed"
                      label={tx('pages.ielts.teacher.integrity_clear')}
                    />
                  )}
                </TableCell>

                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    href={paths.ielts.teacher.student(item.studentId)}
                    size="small"
                    color="inherit"
                  >
                    {tx('pages.ielts.teacher.open_details')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            <TableNoData
              notFound={!data.results.length}
              title={tx('pages.ielts.shared.empty_title')}
            />
          </TableBody>
        </Table>
      </TableContainer>

      <TablePaginationCustom
        count={data.count}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 20]}
      />
    </Card>
  );
}
