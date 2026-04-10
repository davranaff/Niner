// @mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type RecentActivityCardProps = {
  title: string;
  lines: string[];
};

export function RecentActivityCard({ title, lines }: RecentActivityCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        {title}
      </Typography>
      <Stack
        spacing={0}
        divider={<Box sx={{ borderBottom: (t) => `1px dashed ${t.palette.divider}`, my: 1.5 }} />}
      >
        {lines.map((line, i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                mt: 0.35,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {line}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
