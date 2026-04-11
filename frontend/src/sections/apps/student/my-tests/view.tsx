import { useCallback, useEffect, useMemo, useState } from 'react';
// @mui
import Container from '@mui/material/Container';
// locales
import { useLocales } from 'src/locales';
// hooks
import {
  useUrlListState,
  stringFilterParam,
  useSyncTableWithUrlListState,
} from 'src/hooks/use-url-query-state';
import { useDebounce } from 'src/hooks/use-debounce';
// table
import { useTable } from 'src/components/table';
import { AppsPageHeader } from 'src/pages/components/apps';
// api
import { useStudentAttemptsQuery } from './api/use-my-tests-api';
import { MY_TESTS_DEFAULT_PAGE_SIZE } from './api/utils';
import { AttemptsTable, FiltersToolbar } from './components';
import { AppsMyTestsSkeleton } from './skeleton';

// ----------------------------------------------------------------------

const myTestsUrlExtraSchema = Object.freeze({
  module: stringFilterParam('all'),
  status: stringFilterParam('all'),
});

export default function AppsMyTestsView() {
  const { tx } = useLocales();
  const table = useTable({ defaultRowsPerPage: MY_TESTS_DEFAULT_PAGE_SIZE, defaultCurrentPage: 0 });
  const listState = useUrlListState({
    defaultPageSize: MY_TESTS_DEFAULT_PAGE_SIZE,
    defaultOrdering: '-updated_at',
    extraSchema: myTestsUrlExtraSchema,
  });
  const {
    page,
    rowsPerPage,
    search,
    ordering,
    values,
    setValues,
    setSearch,
    handlePageChange,
    handleRowsPerPageChange,
  } = listState;

  const filterModule = values.module as string;
  const filterStatus = values.status as string;

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 400);

  useSyncTableWithUrlListState({
    page,
    rowsPerPage,
    tablePage: table.page,
    tableRowsPerPage: table.rowsPerPage,
    setTablePage: table.setPage,
    setTableRowsPerPage: table.setRowsPerPage,
  });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === searchInput && debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, searchInput, setSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const setUrlFilter = useCallback(
    (key: 'module' | 'status', value: string) => {
      setValues({ [key]: value, page: 1 });
    },
    [setValues]
  );

  const filters = useMemo(
    () => ({
      page,
      rowsPerPage,
      search,
      ordering,
      module: filterModule,
      status: filterStatus,
    }),
    [filterModule, filterStatus, ordering, page, rowsPerPage, search]
  );

  const attemptsQuery = useStudentAttemptsQuery(filters);

  return (
    <Container maxWidth="lg">
      <AppsPageHeader
        title={tx('pages.ielts.my_tests.title')}
        description={tx('pages.ielts.my_tests.description')}
      />

      <FiltersToolbar
        search={searchInput}
        module={filterModule}
        status={filterStatus}
        totalCount={attemptsQuery.data?.count ?? 0}
        onSearchChange={handleSearchChange}
        onModuleChange={(value) => setUrlFilter('module', value)}
        onStatusChange={(value) => setUrlFilter('status', value)}
      />

      {attemptsQuery.isPending && !attemptsQuery.data ? <AppsMyTestsSkeleton /> : null}

      {attemptsQuery.data ? (
        <AttemptsTable
          items={attemptsQuery.data.items}
          count={attemptsQuery.data.count}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          dense={table.dense}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      ) : null}
    </Container>
  );
}
