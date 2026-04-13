import type { ReactNode } from 'react';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

import { fDate } from 'src/utils/format-time';
import {
  buildGeneratedTestOriginLabel,
  buildGeneratedTestSourceAttemptLabel,
} from 'src/sections/apps/common/module-test/generated-test-origin';
import { TestCatalogCard } from 'src/sections/apps/common/module-test/catalog/test-catalog-card';
import type { ModuleAttemptHistoryItem } from 'src/sections/apps/common/module-test/utils/attempt-history';
import { useLocales } from 'src/locales';

import type { ReadingListItem } from '../api/types';

type ReadingTestCardProps = {
  item: ReadingListItem;
  activeLabel: string;
  durationLabel: string;
  publishedAtLabel: string;
  attemptsLabel: string;
  successfulAttemptsLabel: string;
  failedAttemptsLabel: string;
  attemptHistoryLabel: string;
  updatedLabel: string;
  attemptHistoryItems?: ModuleAttemptHistoryItem[];
  actions?: ReactNode;
};

export function ReadingTestCard({
  item,
  activeLabel,
  durationLabel,
  publishedAtLabel,
  attemptsLabel,
  successfulAttemptsLabel,
  failedAttemptsLabel,
  attemptHistoryLabel,
  updatedLabel,
  attemptHistoryItems = [],
  actions,
}: ReadingTestCardProps) {
  const { tx } = useLocales();

  return (
    <TestCatalogCard
      title={item.title}
      description={item.description}
      titleAdornment={
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
          {item.origin ? (
            <Chip
              label={tx('pages.ielts.shared.generated_test')}
              size="small"
              color="warning"
              variant="soft"
            />
          ) : null}
          {item.isActive ? <Chip label={activeLabel} size="small" color="primary" /> : null}
        </Stack>
      }
      summaryLine={`${durationLabel}: ${item.durationMinutes} min · ${attemptsLabel}: ${item.attemptsCount}`}
      primaryValue={`${item.successfulAttemptsCount}/${item.failedAttemptsCount}`}
      primaryValueHint={`${successfulAttemptsLabel} / ${failedAttemptsLabel}`}
      infoLines={[
        ...(item.origin
          ? [
              buildGeneratedTestOriginLabel(item.origin, tx),
              buildGeneratedTestSourceAttemptLabel(item.origin, tx),
            ]
          : []),
        `${successfulAttemptsLabel}: ${item.successfulAttemptsCount} · ${failedAttemptsLabel}: ${item.failedAttemptsCount}`,
        `${publishedAtLabel}: ${fDate(item.createdAt)}`,
      ]}
      attemptHistoryLabel={attemptHistoryLabel}
      updatedLabel={updatedLabel}
      attemptHistoryItems={attemptHistoryItems}
      actions={actions}
    />
  );
}
