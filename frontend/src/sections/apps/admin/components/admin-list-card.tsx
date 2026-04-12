import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { AdminFlatMetaItem } from '../types';

type AdminListCardProps = {
  title: string;
  description?: string | null;
  meta?: AdminFlatMetaItem[];
  actions?: React.ReactNode;
};

export function AdminListCard({ title, description, meta = [], actions }: AdminListCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5, height: 1 }}>
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>

          {description ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          ) : null}
        </Stack>

        {meta.length ? (
          <>
            <Divider />

            <Stack spacing={1}>
              {meta.map((item) => (
                <Stack key={`${item.label}-${item.value}`} direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {item.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : null}

        {actions ? <Stack spacing={1.5}>{actions}</Stack> : null}
      </Stack>
    </Card>
  );
}
