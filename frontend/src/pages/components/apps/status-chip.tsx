import Chip from '@mui/material/Chip';

type AppsStatusChipProps = {
  status: string;
  label: string;
};

function resolveStatusColor(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'terminated') return 'error';
  return 'default';
}

export function AppsStatusChip({ status, label }: AppsStatusChipProps) {
  return <Chip size="small" variant="soft" color={resolveStatusColor(status)} label={label} />;
}
