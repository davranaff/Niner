// @mui
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
// components
import Iconify from 'src/components/iconify';
// locales
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type FiltersToolbarProps = {
  search: string;
  module: string;
  status: string;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onModuleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function FiltersToolbar({
  search,
  module,
  status,
  totalCount,
  onSearchChange,
  onModuleChange,
  onStatusChange,
}: FiltersToolbarProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <TextField
            fullWidth
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            label={tx('pages.ielts.shared.search')}
            placeholder={tx('pages.ielts.shared.search')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={20} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label={tx('pages.ielts.shared.module')}
            value={module}
            onChange={(event) => onModuleChange(event.target.value)}
            sx={{
              width: { xs: '100%', lg: 180 },
              flexShrink: 0,
            }}
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
            sx={{
              width: { xs: '100%', lg: 180 },
              flexShrink: 0,
            }}
          >
            <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
            <MenuItem value="in_progress">{tx('pages.ielts.shared.status_in_progress')}</MenuItem>
            <MenuItem value="completed">{tx('pages.ielts.shared.status_completed')}</MenuItem>
            <MenuItem value="terminated">{tx('pages.ielts.shared.status_terminated')}</MenuItem>
          </TextField>
        </Stack>

        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
          }}
        >
          {tx('pages.ielts.shared.total_results', { count: totalCount })}
        </Typography>
      </Stack>
    </Card>
  );
}
