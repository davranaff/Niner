// @mui
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type IeltsModulePlaceholderViewProps = {
  title: string;
  description: string;
  placeholder: string;
};

export default function IeltsModulePlaceholderView({
  title,
  description,
  placeholder,
}: IeltsModulePlaceholderViewProps) {
  return (
    <Container maxWidth="lg">
      <Stack spacing={1.5}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 560 }}>
          {description}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled', mt: 2 }}>
          {placeholder}
        </Typography>
      </Stack>
    </Container>
  );
}
