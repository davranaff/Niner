import Alert from '@mui/material/Alert';

type AdminManualNoteProps = {
  children: React.ReactNode;
};

export function AdminManualNote({ children }: AdminManualNoteProps) {
  return (
    <Alert severity="info" variant="outlined">
      {children}
    </Alert>
  );
}
