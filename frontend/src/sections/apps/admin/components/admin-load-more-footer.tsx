import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

type AdminLoadMoreFooterProps = {
  count: number;
  label: string;
  buttonLabel: string;
  loading?: boolean;
  onClick: () => void;
};

export function AdminLoadMoreFooter({
  count,
  label,
  buttonLabel,
  loading,
  onClick,
}: AdminLoadMoreFooterProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, mt: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}: {count}
        </Typography>

        <LoadingButton variant="contained" loading={loading} onClick={onClick}>
          {buttonLabel}
        </LoadingButton>
      </Stack>
    </Card>
  );
}
