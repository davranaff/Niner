import type { ReactNode } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import type { SpeakingTestListItem } from '../types';

type Props = {
  item: SpeakingTestListItem;
  activeLabel: string;
  durationLabel: string;
  publishedAtLabel: string;
  actions?: ReactNode;
};

export function SpeakingTestCard({
  item,
  activeLabel,
  durationLabel,
  publishedAtLabel,
  actions,
}: Props) {
  return (
    <Card variant="outlined" sx={{ p: 3, height: 1 }}>
      <Stack spacing={2.5} sx={{ height: 1 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h6">{item.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.description}
              </Typography>
            </Stack>

            <Stack spacing={0.75} alignItems="flex-end">
              <Chip label={item.level} size="small" variant="outlined" color="info" />
              {item.isActive ? <Chip label={activeLabel} size="small" color="success" /> : null}
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack spacing={0.75} sx={{ mt: 'auto' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {durationLabel}: {item.durationMinutes} min
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {publishedAtLabel}: {fDate(item.createdAt)}
          </Typography>
        </Stack>

        {actions ? <Stack direction="row" spacing={1.25}>{actions}</Stack> : null}
      </Stack>
    </Card>
  );
}
