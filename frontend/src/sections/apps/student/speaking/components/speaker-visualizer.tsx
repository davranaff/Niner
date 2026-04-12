import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface SpeakerVisualizerProps {
  label: string;
  active: boolean;
  level: number;
}

export function SpeakerVisualizer({ label, active, level }: SpeakerVisualizerProps) {
  const bars = Array.from({ length: 10 }, (_, index) => {
    const threshold = (index + 1) / 12;
    const isRaised = active && level > threshold * 0.8;
    return (
      <Box
        key={`${label}-${index}`}
        sx={{
          width: 4,
          height: `${22 + index * 4}px`,
          borderRadius: 999,
          bgcolor: isRaised ? 'success.main' : 'divider',
          transition: 'all 120ms ease',
        }}
      />
    );
  });

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ minHeight: 64 }}>
        {bars}
      </Stack>
      <Stack spacing={0.25}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {active ? 'Turn active' : 'Standby'}
        </Typography>
      </Stack>
    </Stack>
  );
}
