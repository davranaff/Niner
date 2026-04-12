import LoadingButton from '@mui/lab/LoadingButton';

import ConfirmDialog from 'src/components/custom-dialog/confirm-dialog';
import { useLocales } from 'src/locales';

type AdminDeleteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminDeleteDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: AdminDeleteDialogProps) {
  const { tx } = useLocales();

  return (
    <ConfirmDialog
      open={open}
      title={title}
      content={description}
      cancelText={tx('pages.admin.shared.actions.cancel')}
      onClose={onClose}
      action={
        <LoadingButton color="error" variant="contained" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </LoadingButton>
      }
    />
  );
}
