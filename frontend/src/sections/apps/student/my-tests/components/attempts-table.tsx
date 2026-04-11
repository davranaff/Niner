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
// routes
import { RouterLink } from 'src/routes/components';
// locales
import { useLocales } from 'src/locales';
// utils
import { fDate } from 'src/utils/format-time';
// table
import { TableHeadCustom, TableNoData, TablePaginationCustom } from 'src/components/table';
import { AppsStatusChip } from 'src/pages/components/apps';
// utils
import { getModuleAttemptPath, getModuleSessionPath } from 'src/sections/apps/common/module-test/utils/module-meta';
// types
import type { StudentAttemptListItem } from '../api/types';

// ----------------------------------------------------------------------

type AttemptsTableProps = {
  items: StudentAttemptListItem[];
  count: number;
  page: number;
  rowsPerPage: number;
  dense: boolean;
  onPageChange: (_event: unknown, nextPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AttemptsTable({
  items,
  count,
  page,
  rowsPerPage,
  dense,
  onPageChange,
  onRowsPerPageChange,
}: AttemptsTableProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined">
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHeadCustom
            headLabel={[
              { id: 'test', label: tx('pages.ielts.shared.test') },
              { id: 'module', label: tx('pages.ielts.shared.module') },
              { id: 'status', label: tx('pages.ielts.shared.status') },
              { id: 'band', label: tx('pages.ielts.shared.estimated_band') },
              { id: 'finish', label: tx('pages.ielts.shared.finish_reason') },
              { id: 'date', label: tx('pages.ielts.shared.updated') },
              { id: 'action', label: '' },
            ]}
          />

          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2">{item.testTitle}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.durationMinutes} min
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>{tx(`pages.ielts.${item.module}.title`)}</TableCell>

                <TableCell>
                  <AppsStatusChip status={item.status} label={tx(`pages.ielts.shared.status_${item.status}`)} />
                </TableCell>

                <TableCell>
                  {typeof item.estimatedBand === 'number' ? item.estimatedBand.toFixed(1) : '-'}
                </TableCell>

                <TableCell>
                  {item.finishReason ? tx(`pages.ielts.shared.finish_${item.finishReason}`) : '-'}
                </TableCell>

                <TableCell>{fDate(item.updatedAt)}</TableCell>

                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    href={
                      item.status === 'in_progress'
                        ? getModuleSessionPath(item.module, String(item.testId), { fromMyTests: true })
                        : getModuleAttemptPath(item.module, String(item.id), { fromMyTests: true })
                    }
                    size="small"
                    color="inherit"
                  >
                    {item.status === 'in_progress'
                      ? tx('pages.ielts.shared.continue')
                      : tx('pages.ielts.shared.open_result')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            <TableNoData notFound={!items.length} title={tx('pages.ielts.shared.empty_title')} />
          </TableBody>
        </Table>
      </TableContainer>

      <TablePaginationCustom
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 20]}
        sx={{
          px: 1,
          '.MuiTablePagination-toolbar': {
            minHeight: 72,
            px: { xs: 1.5, md: 2.5 },
          },
          '.MuiTablePagination-actions': {
            ml: 1,
          },
        }}
      />
    </Card>
  );
}
