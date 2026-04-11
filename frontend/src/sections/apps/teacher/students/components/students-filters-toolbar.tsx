// @mui
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
// locales
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type StudentsFiltersToolbarProps = {
  search: string;
  weakModule: string;
  integrity: string;
  onSearchChange: (value: string) => void;
  onWeakModuleChange: (value: string) => void;
  onIntegrityChange: (value: string) => void;
};

export function StudentsFiltersToolbar({
  search,
  weakModule,
  integrity,
  onSearchChange,
  onWeakModuleChange,
  onIntegrityChange,
}: StudentsFiltersToolbarProps) {
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
          label={tx('pages.ielts.teacher.weak_module')}
          value={weakModule}
          onChange={(event) => onWeakModuleChange(event.target.value)}
          sx={{ minWidth: { md: 180 } }}
        >
          <MenuItem value="all">{tx('pages.ielts.shared.all_modules')}</MenuItem>
          <MenuItem value="reading">{tx('pages.ielts.reading.title')}</MenuItem>
          <MenuItem value="listening">{tx('pages.ielts.listening.title')}</MenuItem>
          <MenuItem value="writing">{tx('pages.ielts.writing.title')}</MenuItem>
        </TextField>

        <TextField
          select
          label={tx('pages.ielts.teacher.integrity_filter')}
          value={integrity}
          onChange={(event) => onIntegrityChange(event.target.value)}
          sx={{ minWidth: { md: 180 } }}
        >
          <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
          <MenuItem value="flagged">{tx('pages.ielts.teacher.integrity_flagged')}</MenuItem>
        </TextField>
      </Stack>
    </Card>
  );
}
