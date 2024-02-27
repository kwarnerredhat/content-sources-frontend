import {
  Grid,
  InputGroup,
  InputGroupItem,
  TextInput,
  InputGroupText,
  Pagination,
  Flex,
  FlexItem,
  PaginationVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { TableVariant, Table, Thead, Tr, Th, Tbody, Td, ThProps } from '@patternfly/react-table';
import { SkeletonTable } from '@redhat-cloud-services/frontend-components';
import Hide from '../../../../../components/Hide/Hide';
import { ContentOrigin, PackageItem } from '../../../../../services/Content/ContentApi';
import EmptyPackageState from '../../PackageModal/components/EmptyPackageState';
import { createUseStyles } from 'react-jss';
import { global_BackgroundColor_100, global_Color_200 } from '@patternfly/react-tokens';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useDebounce from '../../../../../Hooks/useDebounce';
import useRootPath from '../../../../../Hooks/useRootPath';
import { useAppContext } from '../../../../../middleware/AppContext';
import { useGetPackagesQuery } from '../../../../../services/Content/ContentQueries';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px',
    paddingBottom: '8px',
    color: global_Color_200.value,
  },
  mainContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  topContainer: {
    justifyContent: 'space-between',
    padding: '16px 24px 16px 0',
    height: 'fit-content',
  },
  bottomContainer: {
    justifyContent: 'space-between',
    height: 'fit-content',
  },
});

const perPageKey = 'snapshotPackagePerPage';

export function SnapshotPackagesTab() {
  const classes = useStyles();
  const { contentOrigin } = useAppContext();

  const { repoUUID: uuid } = useParams();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  const columnHeaders = ['Name', 'Version', 'Release', 'Arch'];

  const columnSortAttributes = ['name', 'version', 'release', 'arch'];

  const sortString = useMemo(
    () => columnSortAttributes[activeSortIndex] + ':' + activeSortDirection,
    [activeSortIndex, activeSortDirection],
  );

  const debouncedSearchQuery = useDebounce(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, sortString]);

  const {
    isLoading,
    isFetching,
    isError,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useGetPackagesQuery(uuid as string, page, perPage, debouncedSearchQuery, sortString);

  useEffect(() => {
    if (isError) {
      onClose();
    }
  }, [isError]);

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    setPerPage(newPerPage);
    setPage(newPage);
    localStorage.setItem(perPageKey, newPerPage.toString());
  };

  const sortParams = (columnIndex: number, isDisabled: boolean): ThProps['sort'] | undefined => {
    if (isDisabled) return;
    return {
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
        defaultDirection: 'asc',
      },
      onSort: (_event, index, direction) => {
        setActiveSortIndex(index);
        setActiveSortDirection(direction);
      },
      columnIndex,
    };
  };

  const onClose = () =>
    navigate(rootPath + (contentOrigin === ContentOrigin.REDHAT ? `?origin=${contentOrigin}` : ''));

  const {
    data: packageList = [],
    meta: { count = 0 },
  } = data;

  const fetchingOrLoading = isFetching || isLoading;

  const loadingOrZeroCount = fetchingOrLoading || !count;
  return (
    <Grid className={classes.mainContainer}>
      <InputGroup className={classes.topContainer}>
        <InputGroupItem>
          <TextInput
            id='search'
            ouiaId='name_search'
            placeholder='Filter by name'
            value={searchQuery}
            onChange={(_event, value) => setSearchQuery(value)}
          />
          <InputGroupText id='search-icon'>
            <SearchIcon />
          </InputGroupText>
        </InputGroupItem>
        <Hide hide={loadingOrZeroCount}>
          <Pagination
            id='top-pagination-id'
            widgetId='topPaginationWidgetId'
            itemCount={count}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            isCompact
            onPerPageSelect={onPerPageSelect}
          />
        </Hide>
      </InputGroup>
      <Hide hide={!fetchingOrLoading}>
        <Grid className={classes.mainContainer}>
          <SkeletonTable
            rows={perPage}
            numberOfColumns={columnHeaders.length}
            variant={TableVariant.compact}
          />
        </Grid>
      </Hide>
      <Hide hide={fetchingOrLoading}>
        <Table aria-label='Custom repositories table' ouiaId='packages_table' variant='compact'>
          <Hide hide={loadingOrZeroCount}>
            <Thead>
              <Tr>
                {columnHeaders.map((columnHeader, index) => (
                  <Th key={columnHeader + '_column'} sort={sortParams(index, loadingOrZeroCount)}>
                    {columnHeader}
                  </Th>
                ))}
              </Tr>
            </Thead>
          </Hide>
          <Hide hide={!fetchingOrLoading}>
            <EmptyPackageState clearSearch={() => setSearchQuery('')} />
          </Hide>
          <Tbody>
            {packageList.map(({ name, version, release, arch }: PackageItem, index: number) => (
              <Tr key={name + index}>
                <Td>{name}</Td>
                <Td>{version}</Td>
                <Td>{release}</Td>
                <Td>{arch}</Td>
              </Tr>
            ))}
            <Hide hide={!loadingOrZeroCount}>
              <EmptyPackageState clearSearch={() => setSearchQuery('')} />
            </Hide>
          </Tbody>
        </Table>
      </Hide>
      <Flex className={classes.bottomContainer}>
        <FlexItem />
        <FlexItem>
          <Hide hide={loadingOrZeroCount}>
            <Pagination
              id='bottom-pagination-id'
              widgetId='bottomPaginationWidgetId'
              itemCount={count}
              perPage={perPage}
              page={page}
              onSetPage={onSetPage}
              variant={PaginationVariant.bottom}
              onPerPageSelect={onPerPageSelect}
            />
          </Hide>
        </FlexItem>
      </Flex>
    </Grid>
  );
}
