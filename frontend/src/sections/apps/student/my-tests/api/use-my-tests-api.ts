import { type QueryKey } from '@tanstack/react-query';

import { useFetch } from 'src/hooks/api';

import { fetchStudentAttempts } from './my-tests-requests';
import { buildMyTestsRequestParams, toStudentAttemptListPage } from './utils';
import type { MyTestsListFilters } from './types';

const myTestsQueryRoot = ['student-my-tests'] as const;

export const myTestsQueryKeys = {
  root: myTestsQueryRoot,
  /** Primitives only — stable hashing; avoids subtle object-key cache hits when filters change. */
  list: (filters: MyTestsListFilters) =>
    [
      ...myTestsQueryRoot,
      'list',
      filters.page,
      filters.rowsPerPage,
      filters.search,
      filters.ordering,
      filters.module,
      filters.status,
    ] as const,
};

function parseListQueryKey(queryKey: QueryKey): MyTestsListFilters {
  if (!Array.isArray(queryKey) || queryKey.length < 8) {
    throw new Error('Invalid student-my-tests list queryKey');
  }

  const [, , page, rowsPerPage, search, ordering, module, status] = queryKey;

  return {
    page: page as number,
    rowsPerPage: rowsPerPage as number,
    search: search as string,
    ordering: ordering as string,
    module: module as string,
    status: status as string,
  };
}

export function useStudentAttemptsQuery(filters: MyTestsListFilters) {
  const queryKey = myTestsQueryKeys.list(filters);

  return useFetch(
    queryKey,
    async ({ queryKey: qk, signal }) => {
      const response = await fetchStudentAttempts(
        buildMyTestsRequestParams(parseListQueryKey(qk)),
        signal
      );

      return toStudentAttemptListPage(response);
    },
    {
      // Keep previous rows only when paging; do not reuse rows across filter/search/order/page-size changes.
      placeholderData: (previousData, previousQuery) => {
        if (!previousData || !previousQuery?.queryKey) {
          return undefined;
        }
        const pk = previousQuery.queryKey;
        const nk = queryKey;
        if (!Array.isArray(pk) || !Array.isArray(nk) || pk.length < 8 || nk.length < 8) {
          return undefined;
        }
        const sameListContext =
          pk[3] === nk[3] &&
          pk[4] === nk[4] &&
          pk[5] === nk[5] &&
          pk[6] === nk[6] &&
          pk[7] === nk[7];
        return sameListContext ? previousData : undefined;
      },
      // Default structural sharing can reuse nested `items` from a prior response while `count` updates — breaks filters.
      structuralSharing: false,
    }
  );
}
