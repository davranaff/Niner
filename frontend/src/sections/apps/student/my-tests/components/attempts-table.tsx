// @mui
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
// routes
import { RouterLink } from 'src/routes/components';
// locales
import { useLocales } from 'src/locales';
// utils
import { fDate, fDateTime } from 'src/utils/format-time';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';
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
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: 'common.white',
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={(theme) => ({
          px: { xs: 2, md: 2.5 },
          py: 2,
          borderBottom: `1px dashed ${alpha(theme.palette.primary.main, 0.16)}`,
        })}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{ color: 'primary.darker', fontWeight: 700 }}>
            {tx('pages.ielts.my_tests.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {tx('pages.ielts.shared.total_results', { count })}
          </Typography>
        </Stack>
        <Chip size="small" variant="soft" color="primary" label={tx('pages.ielts.shared.page_label', { page: page + 1 })} />
      </Stack>

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
              <TableRow
                key={item.id}
                hover
                sx={(theme) => ({
                  transition: theme.transitions.create('background-color', {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover td': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                })}
              >
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2">{item.testTitle}</Typography>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        #{item.id}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {item.durationMinutes} min
                      </Typography>
                    </Stack>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    color="primary"
                    variant="soft"
                    label={tx(`pages.ielts.${item.module}.title`)}
                  />
                </TableCell>

                <TableCell>
                  <AppsStatusChip status={item.status} label={tx(`pages.ielts.shared.status_${item.status}`)} />
                </TableCell>

                <TableCell>
                  {typeof item.estimatedBand === 'number' ? (
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      {formatRoundedBand(item.estimatedBand)}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      -
                    </Typography>
                  )}
                </TableCell>

                <TableCell>
                  {item.finishReason ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={item.finishReason === 'completed' ? 'success' : 'warning'}
                      label={tx(`pages.ielts.shared.finish_${item.finishReason}`)}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      -
                    </Typography>
                  )}
                </TableCell>

                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {fDateTime(item.updatedAt)}
                    </Typography>
                    {item.startedAt ? (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tx('pages.ielts.shared.start')}: {fDate(item.startedAt)}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>

                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    href={
                      item.status === 'in_progress'
                        ? getModuleSessionPath(item.module, String(item.testId), { fromMyTests: true })
                        : getModuleAttemptPath(item.module, String(item.id), { fromMyTests: true })
                    }
                    size="small"
                    variant={item.status === 'in_progress' ? 'contained' : 'outlined'}
                    color="primary"
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
          borderTop: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.16)}`,
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
