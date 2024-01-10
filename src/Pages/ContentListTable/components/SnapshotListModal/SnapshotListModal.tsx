import {
  Button,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Modal,
  ModalVariant,
  Pagination,
  PaginationVariant,
  TextInput,
} from '@patternfly/react-core';
import {
  InnerScrollContainer,
  Table /* data-codemods */,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import { global_BackgroundColor_100, global_Color_200 } from '@patternfly/react-tokens';
import { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { SkeletonTable } from '@patternfly/react-component-groups';
import Hide from '../../../../components/Hide/Hide';
import { ContentOrigin, SnapshotItem } from '../../../../services/Content/ContentApi';
import { useFetchContent, useGetSnapshotList } from '../../../../services/Content/ContentQueries';
import useDebounce from '../../../../Hooks/useDebounce';
import { useNavigate, useParams } from 'react-router-dom';
import useRootPath from '../../../../Hooks/useRootPath';
import EmptyPackageState from '../PackageModal/components/EmptyPackageState';
import ChangedArrows from './components/ChangedArrows';
import { SearchIcon } from '@patternfly/react-icons';
import { useAppContext } from '../../../../middleware/AppContext';
import RepoConfig from './components/RepoConfig';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
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
    padding: '16px 24px',
    height: 'fit-content',
  },
  bottomContainer: {
    justifyContent: 'space-between',
    height: 'fit-content',
  },
});

const perPageKey = 'snapshotPerPage';

export default function SnapshotListModal() {
  const classes = useStyles();
  const rootPath = useRootPath();
  const { repoUUID: uuid = '' } = useParams();
  const { contentOrigin } = useAppContext();
  const navigate = useNavigate();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('desc');

  const columnHeaders = ['Snapshots', 'Change', 'Packages', 'Errata', 'Config'];

  const columnSortAttributes = ['created_at'];

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
  } = useGetSnapshotList(uuid as string, page, perPage, debouncedSearchQuery, sortString);

  const { data: contentData } = useFetchContent([uuid]);

  useEffect(() => {
    if (isError) {
      onClose();
    }
  }, [isError]);

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    setPerPage(newPerPage);
    setPage(newPage);
    localStorage.setItem(perPageKey, newPerPage.toString());
  };

  const sortParams = (columnIndex: number, isDisabled: boolean): ThProps['sort'] | undefined => {
    if (isDisabled || !columnSortAttributes[columnIndex]) return;
    return {
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
        defaultDirection: 'desc', // starting sort direction when first sorting a column. Defaults to 'desc'
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
    data: snapshotsList = [],
    meta: { count = 0 },
  } = data;

  const fetchingOrLoading = isFetching || isLoading;

  const loadingOrZeroCount = fetchingOrLoading || !count;

  return (
    <Modal
      key={uuid}
      position='top'
      hasNoBodyWrapper
      aria-label='Snapshot list modal'
      ouiaId='snapshot_list_modal'
      ouiaSafe={fetchingOrLoading}
      variant={ModalVariant.medium}
      title='Snapshots'
      description={
        <p className={classes.description}>
          View list of snapshots for{' '}
          {contentData?.name ? <b>{contentData?.name}</b> : 'a repository'}.
          {/* You may select snapshots to delete them.
          <br />
          You may also view the snapshot comparisons <b>here</b>. */}
        </p>
      }
      isOpen
      onClose={onClose}
      footer={
        <Button key='close' variant='secondary' onClick={onClose}>
          Close
        </Button>
      }
    >
      <InnerScrollContainer>
        <Grid className={classes.mainContainer}>
          <InputGroup className={classes.topContainer}>
            <InputGroupItem>
              <TextInput
                id='search'
                type='text'
                ouiaId='name_search'
                placeholder='Search snapshot'
                value={searchQuery}
                onChange={(_, value) => setSearchQuery(value)}
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
            <Table aria-label='snapshot list table' ouiaId='snapshot_list_table' variant='compact'>
              <Hide hide={loadingOrZeroCount}>
                <Thead>
                  <Tr>
                    {columnHeaders.map((columnHeader, index) => (
                      <Th
                        key={columnHeader + '_column'}
                        sort={sortParams(index, loadingOrZeroCount)}
                      >
                        {columnHeader}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
              </Hide>
              <Tbody>
                {snapshotsList.map(
                  (
                    {
                      uuid: snap_uuid,
                      created_at,
                      content_counts,
                      added_counts,
                      removed_counts,
                    }: SnapshotItem,
                    index: number,
                  ) => (
                    <Tr key={created_at + index}>
                      <Td>{new Date(created_at).toUTCString()}</Td>
                      <Td>
                        <ChangedArrows
                          addedCount={
                            (added_counts?.['rpm.advisory'] || 0) +
                            (added_counts?.['rpm.package'] || 0)
                          }
                          removedCount={
                            (removed_counts?.['rpm.advisory'] || 0) +
                            (removed_counts?.['rpm.package'] || 0)
                          }
                        />
                      </Td>
                      <Td>{content_counts?.['rpm.package'] || 0}</Td>
                      <Td>{content_counts?.['rpm.advisory'] || 0}</Td>
                      <Td>
                        <RepoConfig repoUUID={uuid} snapUUID={snap_uuid} />
                      </Td>
                    </Tr>
                  ),
                )}
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
      </InnerScrollContainer>
    </Modal>
  );
}
