import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type InsightListCardProps = {
  title: string;
  items: string[];
  emptyLabel: string;
};

export function InsightListCard({ title, items, emptyLabel }: InsightListCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>

      <Stack spacing={1.5}>
        {(items.length ? items : [emptyLabel]).map((item) => (
          <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                mt: 0.6,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
