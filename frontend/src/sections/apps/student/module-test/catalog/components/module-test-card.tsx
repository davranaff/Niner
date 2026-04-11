import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { AppsStatusChip } from 'src/pages/components/apps';
import { RouterLink } from 'src/routes/components';
import type { TestListItem } from 'src/sections/apps/common/api/types';

type ModuleTestCardProps = {
  item: TestListItem;
  statusLabel: string;
  difficultyLabel: string;
  attemptsLabel: string;
  bestBandLabel: string;
  startLabel: string;
  restartLabel: string;
  continueLabel: string;
  reviewLabel: string;
  detailsHref: string;
  sessionHref?: string | null;
  resultHref?: string | null;
};

export function ModuleTestCard({
  item,
  statusLabel,
  difficultyLabel,
  attemptsLabel,
  bestBandLabel,
  startLabel,
  restartLabel,
  continueLabel,
  reviewLabel,
  detailsHref,
  sessionHref,
  resultHref,
}: ModuleTestCardProps) {
  const isContinueState = item.status === 'in_progress';
  const isReviewState = item.status === 'completed' || item.status === 'terminated';
  let actionLabel = startLabel;
  let actionHref = detailsHref;

  if (isContinueState) {
    actionLabel = continueLabel;
    actionHref = sessionHref || detailsHref;
  } else if (isReviewState) {
    actionLabel = restartLabel;
    actionHref = detailsHref;
  }

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

            <Chip label={item.tag} size="small" variant="soft" color="primary" />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <AppsStatusChip status={item.status} label={statusLabel} />
            <Chip size="small" variant="outlined" label={difficultyLabel} />
          </Stack>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack spacing={0.75}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {attemptsLabel}: {item.attemptsCount}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {bestBandLabel}: {item.bestBand ? item.bestBand.toFixed(1) : '-'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {item.durationMinutes} min · {item.questionCount || item.taskCount} items
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 'auto' }}>
          <Button
            component={RouterLink}
            href={actionHref}
            variant="contained"
            color="inherit"
            fullWidth
          >
            {actionLabel}
          </Button>

          {isReviewState && resultHref ? (
            <Button
              component={RouterLink}
              href={resultHref}
              variant="outlined"
              color="inherit"
              fullWidth
            >
              {reviewLabel}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Card>
  );
}
