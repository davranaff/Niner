import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useLocales } from 'src/locales';

type IntegrityBlockedDialogProps = {
  open: boolean;
  onOpenResult: () => void;
};

export function IntegrityBlockedDialog({ open, onOpenResult }: IntegrityBlockedDialogProps) {
  const { tx } = useLocales();

  return (
    <Dialog open={open} onClose={() => undefined} maxWidth="xs" fullWidth>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Typography variant="h6">{tx('pages.ielts.shared.integrity_dialog_title')}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tx('pages.ielts.shared.integrity_dialog_description')}
        </Typography>
        <Button variant="contained" color="inherit" onClick={onOpenResult}>
          {tx('pages.ielts.shared.open_result')}
        </Button>
      </Stack>
    </Dialog>
  );
}
