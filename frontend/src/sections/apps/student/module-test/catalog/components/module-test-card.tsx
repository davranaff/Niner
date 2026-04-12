import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { AppsStatusChip } from 'src/pages/components/apps';
import { RouterLink } from 'src/routes/components';
import type { TestListItem } from 'src/sections/apps/common/api/types';
import { TestCatalogCard } from 'src/sections/apps/common/module-test/catalog/test-catalog-card';
import type { ModuleAttemptHistoryItem } from 'src/sections/apps/common/module-test/utils/attempt-history';
import { formatRoundedBand } from 'src/sections/apps/common/utils/format-band';

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
  attemptHistoryLabel: string;
  updatedLabel: string;
  detailsHref: string;
  attemptHistoryItems?: ModuleAttemptHistoryItem[];
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
  attemptHistoryLabel,
  updatedLabel,
  detailsHref,
  attemptHistoryItems = [],
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
    <TestCatalogCard
      title={item.title}
      description={item.description}
      titleAdornment={<Chip label={item.tag} size="small" variant="soft" color="primary" />}
      headerMeta={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <AppsStatusChip status={item.status} label={statusLabel} />
          <Chip size="small" variant="outlined" label={difficultyLabel} />
        </Stack>
      }
      summaryLine={`${item.durationMinutes} min · ${attemptsLabel}: ${item.attemptsCount}`}
      primaryValue={formatRoundedBand(item.bestBand)}
      primaryValueHint={bestBandLabel}
      infoLines={[`${item.questionCount || item.taskCount} items`]}
      attemptHistoryLabel={attemptHistoryLabel}
      updatedLabel={updatedLabel}
      attemptHistoryItems={attemptHistoryItems}
      actions={
        <Stack direction="row" spacing={1.5}>
          <Button component={RouterLink} href={actionHref} variant="contained" color="primary" fullWidth>
            {actionLabel}
          </Button>

          {isReviewState && resultHref ? (
            <Button
              component={RouterLink}
              href={resultHref}
              variant="outlined"
              color="primary"
              fullWidth
            >
              {reviewLabel}
            </Button>
          ) : null}
        </Stack>
      }
    />
  );
}
