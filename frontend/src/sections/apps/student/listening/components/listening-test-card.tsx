import type { ReactNode } from 'react';

import Chip from '@mui/material/Chip';

import { fDate } from 'src/utils/format-time';
import { TestCatalogCard } from 'src/sections/apps/common/module-test/catalog/test-catalog-card';
import type { ModuleAttemptHistoryItem } from 'src/sections/apps/common/module-test/utils/attempt-history';

import type { ListeningListItem } from '../api/types';

type Props = {
  item: ListeningListItem;
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

export function ListeningTestCard({
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
}: Props) {
  return (
    <TestCatalogCard
      title={item.title}
      description={item.description}
      titleAdornment={item.isActive ? <Chip label={activeLabel} size="small" color="primary" /> : null}
      summaryLine={`${durationLabel}: ${item.durationMinutes} min · ${attemptsLabel}: ${item.attemptsCount}`}
      primaryValue={`${item.successfulAttemptsCount}/${item.failedAttemptsCount}`}
      primaryValueHint={`${successfulAttemptsLabel} / ${failedAttemptsLabel}`}
      infoLines={[
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
