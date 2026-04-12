import type { AdminLoadMorePage, AdminOffsetPage } from './types';

export function buildAdminLoadMoreParams(page: number, batchSize: number) {
  return {
    offset: 0,
    limit: page * batchSize,
  };
}

export function toAdminLoadMorePage<TItem>(
  response: AdminOffsetPage<TItem>,
  page: number,
  batchSize: number
): AdminLoadMorePage<TItem> {
  return {
    ...response,
    page,
    hasPreviousPage: page > 1,
    hasNextPage: response.items.length === page * batchSize,
  };
}

export function appendToAdminLoadMorePage<TItem extends { id: number }>(item: TItem) {
  return (current: AdminLoadMorePage<TItem> | undefined): AdminLoadMorePage<TItem> | undefined => {
    if (!current) {
      return current;
    }

    if (current.items.some((entry) => entry.id === item.id)) {
      return current;
    }

    return {
      ...current,
      items: [...current.items, item],
    };
  };
}

export function updateInAdminLoadMorePage<TItem extends { id: number }>(item: TItem) {
  return (current: AdminLoadMorePage<TItem> | undefined): AdminLoadMorePage<TItem> | undefined => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      items: current.items.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry)),
    };
  };
}

export function removeFromAdminLoadMorePage<TItem extends { id: number }>(id: number) {
  return (current: AdminLoadMorePage<TItem> | undefined): AdminLoadMorePage<TItem> | undefined => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      items: current.items.filter((entry) => entry.id !== id),
    };
  };
}

export async function scanAdminListItemById<TItem extends { id: number }>(
  id: number,
  fetchPage: (params: { offset: number; limit: number }) => Promise<AdminOffsetPage<TItem>>,
  limit = 100
) {
  const scan = async (offset: number): Promise<TItem | null> => {
    const response = await fetchPage({ offset, limit });
    const found = response.items.find((item) => item.id === id);

    if (found) {
      return found;
    }

    if (response.items.length < limit) {
      return null;
    }

    const lastItem = response.items[response.items.length - 1];
    if (lastItem && lastItem.id >= id) {
      return null;
    }

    return scan(offset + limit);
  };

  return scan(0);
}

export function parseNumberParam(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseMultiLineValues(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyMultiLineValues(values: string[] | null | undefined) {
  return (values ?? []).join('\n');
}

export function formatAdminBoolean(value: boolean) {
  return value ? 'Yes' : 'No';
}
