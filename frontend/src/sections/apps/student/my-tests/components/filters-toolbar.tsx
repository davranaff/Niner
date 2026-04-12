// @mui
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';
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
  const moduleLabel =
    module === 'all' ? tx('pages.ielts.shared.all_modules') : tx(`pages.ielts.${module}.title`);
  const statusLabel =
    status === 'all' ? tx('pages.ielts.shared.all_statuses') : tx(`pages.ielts.shared.status_${status}`);

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: 2.5,
        mb: 3,
        borderColor: alpha(theme.palette.primary.main, 0.2),
        bgcolor: 'common.white',
      })}
    >
      <Stack spacing={2.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Typography variant="subtitle2" sx={{ color: 'primary.darker', fontWeight: 700 }}>
            {tx('pages.ielts.shared.search')}
          </Typography>
          <Chip
            size="small"
            color="primary"
            variant="soft"
            label={tx('pages.ielts.shared.total_results', { count: totalCount })}
          />
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <TextField
            fullWidth
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            label={tx('pages.ielts.shared.search')}
            placeholder={tx('pages.ielts.shared.search')}
            sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.secondary' }} />
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
              '& .MuiInputBase-root': { bgcolor: 'background.paper' },
            }}
          >
            <MenuItem value="all">{tx('pages.ielts.shared.all_modules')}</MenuItem>
            <MenuItem value="reading">{tx('pages.ielts.reading.title')}</MenuItem>
            <MenuItem value="listening">{tx('pages.ielts.listening.title')}</MenuItem>
            <MenuItem value="writing">{tx('pages.ielts.writing.title')}</MenuItem>
            <MenuItem value="speaking">{tx('pages.ielts.speaking.title')}</MenuItem>
          </TextField>

          <TextField
            select
            label={tx('pages.ielts.shared.status')}
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            sx={{
              width: { xs: '100%', lg: 180 },
              flexShrink: 0,
              '& .MuiInputBase-root': { bgcolor: 'background.paper' },
            }}
          >
            <MenuItem value="all">{tx('pages.ielts.shared.all_statuses')}</MenuItem>
            <MenuItem value="in_progress">{tx('pages.ielts.shared.status_in_progress')}</MenuItem>
            <MenuItem value="completed">{tx('pages.ielts.shared.status_completed')}</MenuItem>
            <MenuItem value="terminated">{tx('pages.ielts.shared.status_terminated')}</MenuItem>
          </TextField>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {module !== 'all' ? (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={`${tx('pages.ielts.shared.module')}: ${moduleLabel}`}
            />
          ) : null}
          {status !== 'all' ? (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label={`${tx('pages.ielts.shared.status')}: ${statusLabel}`}
            />
          ) : null}
        </Stack>
      </Stack>
    </Card>
  );
}
