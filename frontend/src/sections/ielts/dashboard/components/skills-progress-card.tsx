// @mui
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type SkillProgressRow = {
  key: string;
  label: string;
  pct: number;
  barColor: string;
};

type SkillsProgressCardProps = {
  title: string;
  rows: SkillProgressRow[];
};

export function SkillsProgressCard({ title, rows }: SkillsProgressCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>
        {title}
      </Typography>
      <Stack spacing={2.5}>
        {rows.map((s) => (
          <Box key={s.key}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography variant="body2">{s.label}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {s.pct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={s.pct}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.16),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  bgcolor: s.barColor,
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Card>
  );
}
