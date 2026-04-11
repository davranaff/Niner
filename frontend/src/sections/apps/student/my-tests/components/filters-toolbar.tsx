// @mui
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
// locales
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type FiltersToolbarProps = {
  search: string;
  module: string;
  status: string;
  onSearchChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function FiltersToolbar({
  search,
  module,
  status,
  onSearchChange,
  onModuleChange,
  onStatusChange,
}: FiltersToolbarProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label={tx('pages.ielts.shared.search')}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <TextField
          select
          label={tx('pages.ielts.shared.module')}
          value={module}
          onChange={(event) => onModuleChange(event.target.value)}
          sx={{ minWidth: { md: 180 } }}
        >
          <MenuItem value="all">{tx('pages.ielts.shared.all_modules')}</MenuItem>
          <MenuItem value="reading">{tx('pages.ielts.reading.title')}</MenuItem>
          <MenuItem value="listening">{tx('pages.ielts.listening.title')}</MenuItem>
          <MenuItem value="writing">{tx('pages.ielts.writing.title')}</MenuItem>
        </TextField>

        <TextField
          select
          label={tx('pages.ielts.shared.status')}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          sx={{ minWidth: { md: 180 } }}
        >
          <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
          <MenuItem value="in_progress">{tx('pages.ielts.shared.status_in_progress')}</MenuItem>
          <MenuItem value="completed">{tx('pages.ielts.shared.status_completed')}</MenuItem>
          <MenuItem value="terminated">{tx('pages.ielts.shared.status_terminated')}</MenuItem>
        </TextField>
      </Stack>
    </Card>
  );
}
