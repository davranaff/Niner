import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form';

import FormProvider from 'src/components/hook-form';
import { useLocales } from 'src/locales';

type AdminUpsertDialogProps<TFieldValues extends FieldValues> = {
  title: string;
  submitLabel: string;
  open: boolean;
  loading?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  methods: UseFormReturn<TFieldValues>;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: SubmitHandler<TFieldValues>;
};

export function AdminUpsertDialog<TFieldValues extends FieldValues>({
  title,
  submitLabel,
  open,
  loading,
  maxWidth = 'sm',
  methods,
  children,
  onClose,
  onSubmit,
}: AdminUpsertDialogProps<TFieldValues>) {
  const { tx } = useLocales();

  return (
    <Dialog fullWidth maxWidth={maxWidth} open={open} onClose={onClose}>
      <FormProvider methods={methods} onSubmit={methods.handleSubmit(onSubmit)}>
        <DialogTitle>{title}</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>{children}</DialogContent>

        <DialogActions>
          <Button color="inherit" variant="outlined" onClick={onClose}>
            {tx('pages.admin.shared.actions.cancel')}
          </Button>
          <LoadingButton type="submit" variant="contained" loading={loading}>
            {submitLabel}
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
