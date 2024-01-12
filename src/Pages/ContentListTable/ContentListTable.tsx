import {
  Bullseye,
  Button,
  Flex,
  FlexItem,
  Grid,
  Pagination,
  PaginationVariant,
  Spinner,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  Table /* data-codemods */,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import { global_BackgroundColor_100, global_Color_400 } from '@patternfly/react-tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import {
  ContentItem,
  FilterData,
  IntrospectRepositoryRequestItem,
  ContentOrigin,
} from '../../services/Content/ContentApi';
import { SkeletonTable } from '@patternfly/react-component-groups';

import {
  useBulkDeleteContentItemMutate,
  useContentListQuery,
  useIntrospectRepositoryMutate,
  useRepositoryParams,
  useTriggerSnapshot,
} from '../../services/Content/ContentQueries';
import ContentListFilters from './components/ContentListFilters';
import Hide from '../../components/Hide/Hide';
import EmptyTableState from '../../components/EmptyTableState/EmptyTableState';
import { useQueryClient } from 'react-query';
import StatusIcon from './components/StatusIcon';
import UrlWithExternalIcon from '../../components/UrlWithLinkIcon/UrlWithLinkIcon';
import PackageCount from './components/PackageCount';
import { useAppContext } from '../../middleware/AppContext';
import ConditionalTooltip from '../../components/ConditionalTooltip/ConditionalTooltip';
import dayjs from 'dayjs';
import ChangedArrows from './components/SnapshotListModal/components/ChangedArrows';
import { Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';

const useStyles = createUseStyles({
  mainContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    display: 'flex',
    flexDirection: 'column',
  },
  mainContainer100Height: {
    composes: ['$mainContainer'], // This extends another class within this stylesheet
    minHeight: '100%',
  },
  topContainer: {
    justifyContent: 'space-between',
    padding: '16px 24px', // This is needed
    height: 'fit-content',
  },
  bottomContainer: {
    justifyContent: 'space-between',
    height: 'fit-content',
  },
  invisible: {
    opacity: 0,
  },
  checkboxMinWidth: {
    minWidth: '45px!important',
  },
  snapshotInfoText: {
    color: global_Color_400.value,
    marginRight: '16px',
  },
  inline: {
    display: 'flex',
  },
});

const perPageKey = 'contentListPerPage';

const ContentListTable = () => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { rbac, features, contentOrigin, setContentOrigin } = useAppContext();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');
  const [checkedRepositories, setCheckedRepositories] = useState<Set<string>>(new Set<string>());
  const isRedHatRepository = contentOrigin === ContentOrigin.REDHAT;

  const [filterData, setFilterData] = useState<FilterData>({
    searchQuery: '',
    versions: [],
    arches: [],
    statuses: [],
  });

  const setOriginAndSearchParams = (origin: ContentOrigin) => {
    if (!features?.snapshots?.accessible) return;
    setContentOrigin(origin);
    setUrlSearchParams(origin === ContentOrigin.EXTERNAL ? {} : { origin });
  };

  useEffect(() => {
    if (
      contentOrigin === ContentOrigin.REDHAT ||
      urlSearchParams.get('origin') === ContentOrigin.REDHAT
    ) {
      setOriginAndSearchParams(ContentOrigin.REDHAT);
    }
  }, []);

  const clearFilters = () =>
    setFilterData({ searchQuery: '', versions: [], arches: [], statuses: [] });

  const notFiltered =
    !filterData.arches?.length &&
    filterData.searchQuery === '' &&
    !filterData.versions?.length &&
    !filterData.statuses?.length;

  const {
    isLoading: repositoryParamsLoading,
    error: repositoryParamsError,
    isError: repositoryParamsIsError,
    data: { distribution_versions: distVersions, distribution_arches: distArches } = {
      distribution_versions: [],
      distribution_arches: [],
    },
  } = useRepositoryParams();

  const columnSortAttributes = [
    'name',
    'distribution_arch',
    'distribution_versions',
    'package_count',
    'last_introspection_time',
    'status',
  ];

  const sortString = (): string =>
    columnSortAttributes[activeSortIndex] + ':' + activeSortDirection;

  const {
    isLoading,
    error,
    isError,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useContentListQuery(page, perPage, filterData, sortString(), contentOrigin);

  const { mutateAsync: introspectRepository, isLoading: isIntrospecting } =
    useIntrospectRepositoryMutate(queryClient, page, perPage, filterData, sortString());

  const introspectRepoForUuid = (uuid: string): Promise<void> =>
    introspectRepository({ uuid: uuid, reset_count: true } as IntrospectRepositoryRequestItem);

  const { mutateAsync: triggerSnapshotMutation } = useTriggerSnapshot(queryClient);

  const triggerSnapshot = async (uuid: string): Promise<void> => {
    try {
      const result = await triggerSnapshotMutation(uuid);
      console.log('Snapshot triggered successfully', result);
    } catch (error) {
      console.error('Error triggering snapshot', error);
    }
  };

  const { mutateAsync: deleteItems, isLoading: isDeletingItems } = useBulkDeleteContentItemMutate(
    queryClient,
    checkedRepositories,
    page,
    perPage,
    filterData,
    sortString(),
  );

  // Other update actions will be added to this later.
  const actionTakingPlace =
    isFetching || repositoryParamsLoading || isIntrospecting || isDeletingItems;

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    localStorage.setItem(perPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const sortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
      defaultDirection: 'asc', // starting sort direction when first sorting a column. Defaults to 'asc'
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const columnHeaders = [
    'Name',
    'Architecture',
    'Versions',
    'Packages',
    'Last Introspection',
    'Status',
  ];

  const archesDisplay = (arch: string) => distArches.find(({ label }) => arch === label)?.name;

  const versionDisplay = (versions: Array<string>): string =>
    distVersions
      .filter(({ label }) => versions?.includes(label))
      .map(({ name }) => name)
      .join(', ');

  const lastIntrospectionDisplay = (time?: string): string =>
    time === '' || time === undefined ? 'Never' : dayjs(time).fromNow();

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const {
    data: contentList = [],
    meta: { count = 0 },
  } = data;

  const rowActions = useCallback(
    (rowData: ContentItem): IAction[] =>
      isRedHatRepository
        ? features?.snapshots?.accessible
          ? [
              {
                isDisabled:
                  actionTakingPlace ||
                  !rowData.snapshot ||
                  !(rowData.snapshot && rowData.last_snapshot_uuid),
                title:
                  rowData.snapshot && rowData.last_snapshot_uuid
                    ? 'View all snapshots'
                    : 'No snapshots yet',
                onClick: () => {
                  navigate(`${rowData.uuid}/snapshots`);
                },
              },
            ]
          : []
        : [
            {
              isDisabled: actionTakingPlace,
              title: 'Edit',
              onClick: () => {
                navigate(`edit-repository?repoUUIDS=${rowData.uuid}`);
              },
            },
            ...(features?.snapshots?.accessible
              ? [
                  {
                    isDisabled:
                      actionTakingPlace ||
                      !rowData.snapshot ||
                      !(rowData.snapshot && rowData.last_snapshot_uuid),
                    title:
                      rowData.snapshot && rowData.last_snapshot_uuid
                        ? 'View all snapshots'
                        : 'No snapshots yet',
                    onClick: () => {
                      navigate(`${rowData.uuid}/snapshots`);
                    },
                  },
                ]
              : []),
            {
              isDisabled: actionTakingPlace || rowData?.status === 'Retrying',
              title: 'Trigger Snapshot',
              onClick: () => {
                try {
                  triggerSnapshot(rowData.uuid);
                } catch (error) {
                  console.error('Error triggering snapshot:', error);
                }
              },
            },
            {
              isDisabled: actionTakingPlace || rowData?.status == 'Retrying',
              title: 'Introspect Now',
              onClick: () => introspectRepoForUuid(rowData?.uuid).then(clearCheckedRepositories),
            },
            { isSeparator: true },
            {
              title: 'Delete',
              onClick: () => navigate(`delete-repository?repoUUIDS=${rowData.uuid}`),
            },
          ],
    [actionTakingPlace, checkedRepositories, isRedHatRepository],
  );

  const clearCheckedRepositories = () => setCheckedRepositories(new Set<string>());

  // Applied to all repos on current page
  const selectAllRepos = (_, checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>(checkedRepositories);
      data.data
        .filter((contentItem) => repoCanBeChecked(contentItem))
        .forEach((contentItem) => newSet.add(contentItem.uuid));
      setCheckedRepositories(newSet);
    } else {
      const newSet = new Set<string>(checkedRepositories);
      for (const contentItem of data.data) {
        newSet.delete(contentItem.uuid);
      }
      setCheckedRepositories(newSet);
    }
  };

  const repoCanBeChecked = (contentItem: ContentItem) => contentItem.status !== 'Pending';

  const atLeastOneRepoChecked = useMemo(() => checkedRepositories.size >= 1, [checkedRepositories]);

  const areAllReposPending = useMemo(
    () => data.data.every((contentItem) => !repoCanBeChecked(contentItem)),
    [data],
  );

  const areAllReposSelected = useMemo(() => {
    let atLeastOneSelectedOnPage = false;
    const allSelectedOrPending = data.data.every((contentItem) => {
      if (checkedRepositories.has(contentItem.uuid)) {
        atLeastOneSelectedOnPage = true;
      }
      return !repoCanBeChecked(contentItem) || checkedRepositories.has(contentItem.uuid);
    });
    // Returns false if all repos on current page are pending (none selected)
    return allSelectedOrPending && atLeastOneSelectedOnPage;
  }, [data, checkedRepositories]);

  const onSelectRepo = (uuid: string, value: boolean) => {
    const newSet = new Set<string>(checkedRepositories);
    if (value) {
      newSet.add(uuid);
    } else {
      newSet.delete(uuid);
    }
    setCheckedRepositories(newSet);
  };

  const deleteCheckedRepos = () =>
    deleteItems(checkedRepositories).then(() => {
      const newMaxPage = Math.ceil((count - checkedRepositories.size) / perPage);
      if (page > 1 && newMaxPage < page) {
        setPage(newMaxPage);
      }
      clearCheckedRepositories();
    });

  const itemName =
    contentOrigin === ContentOrigin.EXTERNAL ? 'custom repositories' : 'red hat repositories';
  const notFilteredBody = 'To get started, create a custom repository';

  const countIsZero = count === 0;
  const showLoader = countIsZero && notFiltered && !isLoading;

  // If Red Hat repositories returns a 0 count
  if (notFiltered && countIsZero && !isFetching && contentOrigin === ContentOrigin.REDHAT) {
    throw new Error('Unable to load Red Hat repositories');
  }

  return (
    <>
      <Outlet
        context={{
          clearCheckedRepositories,
          deletionContext: { page, perPage, filterData, contentOrigin, sortString: sortString() },
        }}
      />
      <Grid
        data-ouia-safe={!actionTakingPlace}
        data-ouia-component-id='content_list_page'
        className={countIsZero ? classes.mainContainer100Height : classes.mainContainer}
      >
        <Flex className={classes.topContainer}>
          <ContentListFilters
            contentOrigin={contentOrigin}
            setContentOrigin={setOriginAndSearchParams}
            isLoading={isLoading}
            setFilterData={(values) => {
              setFilterData(values);
              setPage(1);
            }}
            filterData={filterData}
            atLeastOneRepoChecked={atLeastOneRepoChecked}
            numberOfReposChecked={checkedRepositories.size}
            deleteCheckedRepos={deleteCheckedRepos}
          />
          <FlexItem>
            <Pagination
              id='top-pagination-id'
              widgetId='topPaginationWidgetId'
              isDisabled={isLoading}
              itemCount={count}
              perPage={perPage}
              page={page}
              onSetPage={onSetPage}
              isCompact
              onPerPageSelect={onPerPageSelect}
            />
          </FlexItem>
        </Flex>
        {showLoader ? (
          <Bullseye data-ouia-safe={!actionTakingPlace} data-ouia-component-id='content_list_page'>
            <EmptyTableState
              notFiltered={notFiltered}
              clearFilters={clearFilters}
              itemName={itemName}
              notFilteredBody={notFilteredBody}
              notFilteredButton={
                <ConditionalTooltip
                  content='You do not have the required permissions to perform this action.'
                  show={!rbac?.write}
                  setDisabled
                >
                  <Button
                    id='createContentSourceButton'
                    ouiaId='create_content_source'
                    variant='primary'
                    isDisabled={isLoading}
                    onClick={() => navigate('add-repository')}
                  >
                    Add repositories
                  </Button>
                </ConditionalTooltip>
              }
            />
          </Bullseye>
        ) : (
          <>
            <Hide hide={!isLoading}>
              <Grid className={classes.mainContainer}>
                <SkeletonTable
                  rows={perPage}
                  numberOfColumns={columnHeaders.length}
                  variant={TableVariant.compact}
                />
              </Grid>
            </Hide>
            <Hide hide={countIsZero || isLoading}>
              <>
                <Table
                  aria-label='Custom repositories table'
                  ouiaId='custom_repositories_table'
                  variant='compact'
                >
                  <Thead>
                    <Tr>
                      <Hide hide={!rbac?.write || isRedHatRepository}>
                        <Th
                          className={classes.checkboxMinWidth}
                          select={{
                            onSelect: selectAllRepos,
                            isSelected: areAllReposSelected,
                            isHeaderSelectDisabled: areAllReposPending,
                          }}
                        />
                      </Hide>
                      {columnHeaders.map((columnHeader, index) => (
                        <Th key={columnHeader + 'column'} sort={sortParams(index)}>
                          {columnHeader}
                        </Th>
                      ))}
                      <Th>
                        <Spinner size='md' className={actionTakingPlace ? '' : classes.invisible} />
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {contentList.map((rowData: ContentItem, index) => {
                      const {
                        uuid,
                        name,
                        url,
                        last_snapshot,
                        distribution_arch,
                        distribution_versions,
                        last_introspection_time,
                      } = rowData;
                      return (
                        <Tr key={uuid}>
                          <Hide hide={!rbac?.write || isRedHatRepository}>
                            <Td
                              select={{
                                rowIndex: index,
                                onSelect: (_event, isSelecting) =>
                                  onSelectRepo(rowData.uuid, isSelecting),
                                isSelected: checkedRepositories.has(rowData.uuid),
                                isDisabled: !repoCanBeChecked(rowData),
                              }}
                            />
                          </Hide>
                          <Td>
                            {name}
                            <UrlWithExternalIcon href={url} />
                            <Hide hide={!features?.snapshots?.accessible}>
                              <Flex>
                                <FlexItem className={classes.snapshotInfoText}>
                                  {last_snapshot
                                    ? `Last snapshot ${dayjs(last_snapshot?.created_at).fromNow()}`
                                    : 'No snapshot yet'}
                                </FlexItem>
                                <Hide hide={!last_snapshot}>
                                  <FlexItem className={classes.inline}>
                                    <FlexItem className={classes.snapshotInfoText}>
                                      Changes:
                                    </FlexItem>
                                    <ChangedArrows
                                      addedCount={
                                        (last_snapshot?.added_counts?.['rpm.advisory'] || 0) +
                                        (last_snapshot?.added_counts?.['rpm.package'] || 0)
                                      }
                                      removedCount={
                                        (last_snapshot?.removed_counts?.['rpm.advisory'] || 0) +
                                        (last_snapshot?.removed_counts?.['rpm.package'] || 0)
                                      }
                                    />
                                  </FlexItem>
                                </Hide>
                              </Flex>
                            </Hide>
                          </Td>
                          <Td>{archesDisplay(distribution_arch)}</Td>
                          <Td>{versionDisplay(distribution_versions)}</Td>
                          <Td>
                            <PackageCount rowData={rowData} />
                          </Td>
                          <Td>{lastIntrospectionDisplay(last_introspection_time)}</Td>
                          <Td>
                            <StatusIcon rowData={rowData} retryHandler={introspectRepoForUuid} />
                          </Td>
                          <Hide hide={!rowActions(rowData)?.length}>
                            <Td isActionCell>
                              <ConditionalTooltip
                                content={
                                  rowData?.status == 'Pending'
                                    ? 'Introspection is in progress'
                                    : 'You do not have the required permissions to perform this action.'
                                }
                                show={
                                  !isRedHatRepository &&
                                  (!rbac?.write || rowData?.status === 'Pending')
                                }
                                setDisabled
                              >
                                <ActionsColumn items={rowActions(rowData)} />
                              </ConditionalTooltip>
                            </Td>
                          </Hide>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
                <Flex className={classes.bottomContainer}>
                  <FlexItem />
                  <FlexItem>
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
                  </FlexItem>
                </Flex>
              </>
            </Hide>
            <Hide hide={!countIsZero || isLoading}>
              <EmptyTableState
                notFiltered={notFiltered}
                clearFilters={clearFilters}
                itemName={itemName}
                notFilteredBody={notFilteredBody}
                notFilteredButton={
                  <ConditionalTooltip
                    content='You do not have the required permissions to perform this action.'
                    show={!rbac?.write}
                    setDisabled
                  >
                    <Button
                      id='createContentSourceButton'
                      ouiaId='create_content_source'
                      variant='primary'
                      isDisabled={isLoading}
                      onClick={() => navigate('add-repository')}
                    >
                      Add repositories
                    </Button>
                  </ConditionalTooltip>
                }
              />
            </Hide>
          </>
        )}
      </Grid>
    </>
  );
};

export const useContentListOutletContext = () =>
  useOutletContext<{
    clearCheckedRepositories: () => void;
    deletionContext: {
      page: number;
      perPage: number;
      filterData: FilterData;
      contentOrigin: ContentOrigin;
      sortString: string;
    };
  }>();

export default ContentListTable;
