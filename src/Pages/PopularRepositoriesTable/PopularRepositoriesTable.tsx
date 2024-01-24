import {
  Button,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  Pagination,
  PaginationVariant,
  Spinner,
  TextInput,
  InputGroupItem,
  InputGroupText,
  Chip,
  ChipGroup,
} from '@patternfly/react-core';
import {
  Table /* data-codemods */,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import {
  global_BackgroundColor_100,
  global_disabled_color_100,
  global_disabled_color_200,
} from '@patternfly/react-tokens';
import { useEffect, useState, useMemo } from 'react';
import { createUseStyles } from 'react-jss';
import { SkeletonTable } from '@patternfly/react-component-groups';

import {
  usePopularRepositoriesQuery,
  useDeletePopularRepositoryMutate,
  useRepositoryParams,
  useAddPopularRepositoryQuery,
  useBulkDeleteContentItemMutate,
} from '../../services/Content/ContentQueries';
import {
  CreateContentRequest,
  CreateContentRequestItem,
  FilterData,
  PopularRepository,
} from '../../services/Content/ContentApi';
import Hide from '../../components/Hide/Hide';
import { useQueryClient } from 'react-query';
import { useAppContext } from '../../middleware/AppContext';
import ConditionalTooltip from '../../components/ConditionalTooltip/ConditionalTooltip';
import UrlWithExternalIcon from '../../components/UrlWithLinkIcon/UrlWithLinkIcon';
import { SearchIcon } from '@patternfly/react-icons';
import useDebounce from '../../Hooks/useDebounce';
import EmptyTableState from '../../components/EmptyTableState/EmptyTableState';
import DeleteKebab from '../../components/DeleteKebab/DeleteKebab';
import { repoToRequestItem } from './helper';
import { AddRepo } from './components/AddRepo';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownToggleAction,
} from '@patternfly/react-core/deprecated';

const useStyles = createUseStyles({
  chipsContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    paddingTop: '16px',
    display: 'flex',
    alignItems: 'center',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  mainContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    display: 'flex',
    flexDirection: 'column',
    // Remove the below targeted style when removing deprecated components
    '& .pf-v5-c-dropdown__menu': {
      marginLeft: '-138px',
      '& li': {
        listStyle: 'none',
      },
    },
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
  addRepositoriesButton: {
    marginLeft: '16px',
  },
  checkboxMinWidth: {
    minWidth: '45px!important',
  },
  disabled: {
    color: global_disabled_color_100.value,
  },
  repositoryActions: {
    display: 'flex',
    flexDirection: 'row',
  },
  disabledDropdownButton: {
    color: global_disabled_color_100.value + ' !important',
    backgroundColor: global_disabled_color_200.value + ' !important',
  },
});

const perPageKey = 'popularRepositoriesperPage';

const PopularRepositoriesTable = () => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const { rbac, features } = useAppContext();
  // Uses urls as map key because uuids don't exist on repositories that haven't been created
  const [checkedRepositoriesToAdd, setCheckedRepositoriesToAdd] = useState<
    Map<string, CreateContentRequestItem>
  >(new Map());
  // Set of uuids which are required for bulk delete
  const [checkedRepositoriesToDelete, setCheckedRepositoriesToDelete] = useState<Set<string>>(
    new Set(),
  );
  const [selectedData, setSelectedData] = useState<CreateContentRequest>([]);
  const [selectedUUID, setSelectedUUID] = useState<string>('');

  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchValue = useDebounce(searchValue);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [isActionOpen, setIsActionOpen] = useState(false);

  const onDropdownToggle = (_, isActionOpen: boolean) => {
    setIsActionOpen(isActionOpen);
  };

  const onDropdownFocus = () => {
    const element = document.getElementById('toggle-add-selected');
    element?.focus();
  };

  const onDropdownSelect = () => {
    setIsActionOpen(false);
    onDropdownFocus();
  };

  const {
    isLoading,
    error,
    isError,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = usePopularRepositoriesQuery(page, perPage, {
    searchQuery: !searchValue ? searchValue : debouncedSearchValue,
  });

  const {
    isLoading: repositoryParamsLoading,
    error: repositoryParamsError,
    isError: repositoryParamsIsError,
    data: { distribution_versions: distVersions, distribution_arches: distArches } = {
      distribution_versions: [],
      distribution_arches: [],
    },
  } = useRepositoryParams();

  const { mutateAsync: addContentQuery, isLoading: isAdding } = useAddPopularRepositoryQuery(
    queryClient,
    selectedData,
    page,
    perPage,
    { searchQuery: debouncedSearchValue } as FilterData,
  );

  const clearCheckedRepositories = () => {
    setCheckedRepositoriesToAdd(new Map());
    setCheckedRepositoriesToDelete(new Set());
  };

  const selectAllRepos = (_, checked: boolean) => {
    const newSet = new Set(checkedRepositoriesToDelete);
    const newMap = new Map(checkedRepositoriesToAdd);
    if (checked) {
      popularData.forEach((repo) => {
        if (repo.uuid) {
          newSet.add(repo.uuid);
        } else {
          newMap.set(repo.url, repoToRequestItem(repo));
        }
      });
    } else {
      popularData.forEach((repo) => {
        if (repo.uuid) {
          newSet.delete(repo.uuid);
        } else {
          newMap.delete(repo.url);
        }
      });
    }
    setCheckedRepositoriesToDelete(newSet);
    setCheckedRepositoriesToAdd(newMap);
  };

  const atLeastOneRepoToDeleteChecked = useMemo(
    () => checkedRepositoriesToDelete.size >= 1,
    [checkedRepositoriesToDelete],
  );
  const atLeastOneRepoToAddChecked = useMemo(
    () => checkedRepositoriesToAdd.size >= 1,
    [checkedRepositoriesToAdd],
  );

  const areAllReposSelected = useMemo(
    () =>
      data.data.every((repo) => {
        if (repo.uuid) {
          return checkedRepositoriesToDelete.has(repo.uuid);
        } else {
          return checkedRepositoriesToAdd.has(repo.url);
        }
      }),
    [data, checkedRepositoriesToAdd, checkedRepositoriesToDelete],
  );

  const onSelectRepo = (repo: PopularRepository, value: boolean) => {
    if (repo.uuid) {
      const newSet = new Set(checkedRepositoriesToDelete);
      if (value) {
        newSet.add(repo.uuid);
      } else {
        newSet.delete(repo.uuid);
      }
      setCheckedRepositoriesToDelete(newSet);
    } else {
      const newMap = new Map(checkedRepositoriesToAdd);
      if (value) {
        newMap.set(repo.url, repoToRequestItem(repo));
      } else {
        newMap.delete(repo.url);
      }
      setCheckedRepositoriesToAdd(newMap);
    }
  };

  useEffect(() => {
    if (!isFetching) {
      setSelectedData([]);
      setSelectedUUID('');
    }
  }, [isFetching]);

  useEffect(() => {
    if (selectedData.length != 0) {
      addContentQuery().then(
        () => {
          setSelectedData([]);
          clearCheckedRepositories();
        },
        () => setSelectedData([]),
      );
    }
  }, [selectedData]);

  useEffect(() => {
    if (selectedUUID) {
      deleteItem(selectedUUID).then(clearCheckedRepositories, () => setSelectedUUID(''));
    }
  }, [selectedUUID]);

  const archesDisplay = (arch: string) => distArches.find(({ label }) => arch === label)?.name;

  const versionDisplay = (versions: Array<string>): string =>
    distVersions
      .filter(({ label }) => versions?.includes(label))
      .map(({ name }) => name)
      .join(', ');

  const { mutateAsync: deleteItem, isLoading: isDeleting } = useDeletePopularRepositoryMutate(
    queryClient,
    page,
    perPage,
    { searchQuery: debouncedSearchValue } as FilterData,
  );

  const { mutateAsync: deleteItems, isLoading: isDeletingItems } = useBulkDeleteContentItemMutate(
    queryClient,
    checkedRepositoriesToDelete,
    page,
    perPage,
    { searchQuery: debouncedSearchValue } as FilterData,
    undefined, // sort string
  );

  // Other update actions will be added to this later.
  const actionTakingPlace =
    isDeleting || isFetching || repositoryParamsLoading || isAdding || isDeletingItems;

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    localStorage.setItem(perPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const addSelected = (snapshot: boolean) => {
    const request: CreateContentRequest = [];
    checkedRepositoriesToAdd.forEach((repo) => {
      request.push({
        ...repo,
        snapshot,
      });
    });
    setSelectedData(request);
  };

  const deleteSelected = async () => {
    deleteItems(checkedRepositoriesToDelete).then(() => {
      const newMaxPage = Math.ceil((count - checkedRepositoriesToDelete.size) / perPage);
      if (page > 1 && newMaxPage < page) {
        setPage(newMaxPage);
      }
      clearCheckedRepositories();
    });
  };

  const addRepo = (key: number, repo: PopularRepository, snapshot: boolean) => {
    const newData: CreateContentRequest = [];
    newData[key] = repoToRequestItem(repo, snapshot);
    setSelectedData(newData);
  };

  const columnHeaders = ['Name', 'Architecture', 'Versions'];

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const {
    data: popularData = [],
    meta: { count = 0 },
  } = data;

  const countIsZero = !data?.data?.length;

  const clearFilters = () => {
    setSearchValue('');
    setSearchQuery('');
  };

  return (
    <Grid
      data-ouia-safe={!actionTakingPlace}
      data-ouia-component-id='popular_repositories_page'
      className={classes.mainContainer}
    >
      <Flex className={classes.topContainer}>
        <FlexItem>
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                isDisabled={isLoading}
                id='search'
                ouiaId='filter_search'
                placeholder='Filter by name/url'
                value={searchQuery}
                onChange={(_event, value) => setSearchQuery(value)}
              />
              <InputGroupText isDisabled={isLoading} id='search-icon'>
                <SearchIcon />
              </InputGroupText>
            </InputGroupItem>
            <InputGroupItem>
              <FlexItem className={classes.repositoryActions}>
                {/* RBAC popover takes precedence */}
                <ConditionalTooltip
                  content={
                    !rbac?.write
                      ? 'You do not have the required permissions to perform this action.'
                      : 'Make a selection below to add multiple repositories'
                  }
                  show={!rbac?.write || !atLeastOneRepoToAddChecked}
                  setDisabled
                >
                  {(() => {
                    const defaultText = atLeastOneRepoToAddChecked
                      ? `Add ${checkedRepositoriesToAdd.size} repositories`
                      : 'Add selected repositories';
                    const withoutSnapshotText = defaultText + ' without snapshotting';
                    const isDisabled = !rbac?.write || !atLeastOneRepoToAddChecked;
                    if (features?.snapshots?.enabled && features.snapshots.accessible) {
                      const className = isDisabled ? classes.disabledDropdownButton : undefined;
                      return (
                        <Dropdown
                          onSelect={onDropdownSelect}
                          className={classes.addRepositoriesButton}
                          ouiaId='add-selected-toggle-dropdown'
                          toggle={
                            <DropdownToggle
                              ouiaId='add-selected-dropdown-toggle-no-snap'
                              className={className}
                              splitButtonItems={[
                                <DropdownToggleAction
                                  key='action'
                                  data-ouia-component-id='add_checked_repos-with-snap'
                                  onClick={() => addSelected(true)}
                                  className={className}
                                >
                                  {defaultText}
                                </DropdownToggleAction>,
                              ]}
                              toggleVariant='primary'
                              splitButtonVariant='action'
                              onToggle={onDropdownToggle}
                              isDisabled={isDisabled}
                            />
                          }
                          isOpen={isActionOpen}
                        >
                          <DropdownItem
                            key='action'
                            component='button'
                            onClick={() => addSelected(false)}
                            ouiaId='add-selected-repos-no-snap'
                          >
                            {withoutSnapshotText}
                          </DropdownItem>
                        </Dropdown>
                      );
                    } else {
                      return (
                        <Button
                          onClick={() => addSelected(false)}
                          className={classes.addRepositoriesButton}
                          isDisabled={isDisabled}
                          ouiaId='add_checked_repos'
                        >
                          {defaultText}
                        </Button>
                      );
                    }
                  })()}
                </ConditionalTooltip>
                <ConditionalTooltip
                  content='You do not have the required permissions to perform this action.'
                  show={!rbac?.write}
                  setDisabled
                >
                  <DeleteKebab
                    atLeastOneRepoChecked={atLeastOneRepoToDeleteChecked}
                    numberOfReposChecked={checkedRepositoriesToDelete.size}
                    deleteCheckedRepos={deleteSelected}
                    toggleOuiaId='popular_repositories_kebab_toggle'
                  />
                </ConditionalTooltip>
              </FlexItem>
            </InputGroupItem>
          </InputGroup>
          {(debouncedSearchValue !== '' || searchQuery !== '') && (
            <Flex>
              <FlexItem fullWidth={{ default: 'fullWidth' }} className={classes.chipsContainer}>
                <ChipGroup categoryName='Name/URL'>
                  <Chip key='search_chip' onClick={() => setSearchQuery('')}>
                    {searchQuery}
                  </Chip>
                </ChipGroup>
                <Button
                  className={classes.clearFilters}
                  onClick={clearFilters}
                  variant='link'
                  isInline
                >
                  Clear filters
                </Button>
              </FlexItem>
            </Flex>
          )}
        </FlexItem>
        <FlexItem>
          <Hide hide={isLoading || countIsZero}>
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
            <Hide hide={!debouncedSearchValue}></Hide>
          </Hide>
        </FlexItem>
      </Flex>
      <Hide hide={!isLoading}>
        <Grid className={classes.mainContainer}>
          <SkeletonTable
            rows={perPage}
            numberOfColumns={columnHeaders.length}
            variant={TableVariant.compact}
          />
        </Grid>
      </Hide>
      <Hide hide={isLoading || countIsZero}>
        <>
          <Table
            aria-label='Popular repositories table'
            ouiaId='popular_repos_table'
            variant='compact'
          >
            <Thead>
              <Tr>
                <Hide hide={!rbac?.write}>
                  <Th
                    className={classes.checkboxMinWidth}
                    select={{
                      onSelect: selectAllRepos,
                      isSelected: areAllReposSelected,
                    }}
                  />
                </Hide>
                {columnHeaders.map((columnHeader) => (
                  <Th key={columnHeader + 'column'}>{columnHeader}</Th>
                ))}
                <Th>
                  <Spinner size='md' className={actionTakingPlace ? '' : classes.invisible} />
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {popularData.map((repo, key) => {
                const {
                  uuid,
                  existing_name,
                  suggested_name,
                  url,
                  distribution_arch,
                  distribution_versions,
                } = repo;
                return (
                  <Tr key={suggested_name + uuid}>
                    <Hide hide={!rbac?.write}>
                      {/* Never disabled because popular repositories can be both added and deleted */}
                      <Td
                        select={{
                          rowIndex: key,
                          onSelect: (_event, isSelecting) => onSelectRepo(repo, isSelecting),
                          isSelected: uuid
                            ? checkedRepositoriesToDelete.has(uuid)
                            : checkedRepositoriesToAdd.has(url),
                        }}
                      />
                    </Hide>
                    <Td>
                      <>
                        <Flex direction={{ default: 'row' }}>
                          <FlexItem>{suggested_name}</FlexItem>
                          {existing_name && suggested_name !== existing_name && (
                            <FlexItem className={classes.disabled}>
                              Current name: {existing_name}
                            </FlexItem>
                          )}
                        </Flex>
                        <UrlWithExternalIcon href={url} />
                      </>
                    </Td>
                    <Td>{archesDisplay(distribution_arch)}</Td>
                    <Td>{versionDisplay(distribution_versions)}</Td>
                    <Td width={10}>
                      <ConditionalTooltip
                        content='You do not have the required permissions to perform this action.'
                        show={!rbac?.write}
                        setDisabled
                      >
                        {uuid ? (
                          <Button
                            isDisabled={uuid === selectedUUID || isAdding}
                            onClick={() => setSelectedUUID(uuid)}
                            variant='danger'
                            ouiaId='remove_popular_repo'
                          >
                            Remove
                          </Button>
                        ) : (
                          <AddRepo
                            isDisabled={
                              selectedData[key]?.url === url ||
                              isFetching ||
                              isDeleting ||
                              isDeletingItems
                            }
                            addRepo={(snapshot) => addRepo(key, repo, snapshot)}
                          />
                        )}
                      </ConditionalTooltip>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <Hide hide={isLoading || countIsZero}>
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
          </Hide>
        </>
      </Hide>
      <Hide hide={!countIsZero}>
        <EmptyTableState
          clearFilters={() => setSearchValue('')}
          notFiltered={!debouncedSearchValue} // The second item prevents the clear button from being removed abruptly
          itemName='popular repositories'
        />
      </Hide>
    </Grid>
  );
};

export default PopularRepositoriesTable;
