// @mui
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
// locales
import { useLocales } from 'src/locales';

// ----------------------------------------------------------------------

type AnalyticsProgressCardProps = {
  title: string;
  items: Array<{ label: string; count: number }>;
  translateModuleLabel?: boolean;
};

export function AnalyticsProgressCard({
  title,
  items,
  translateModuleLabel,
}: AnalyticsProgressCardProps) {
  const { tx } = useLocales();

  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {title}
      </Typography>

      <Stack spacing={2}>
        {items.map((item) => (
          <Stack key={item.label} spacing={0.75}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">
                {translateModuleLabel
                  ? tx(`pages.ielts.${item.label}.title`)
                  : item.label.replaceAll('_', ' ')}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {item.count}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={item.count * 20}
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.14),
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
