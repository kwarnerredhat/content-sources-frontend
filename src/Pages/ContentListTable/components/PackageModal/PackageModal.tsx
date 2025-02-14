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
import { SkeletonTable } from '@redhat-cloud-services/frontend-components';
import Hide from '../../../../components/Hide/Hide';
import { ContentOrigin, PackageItem } from '../../../../services/Content/ContentApi';
import { useGetPackagesQuery } from '../../../../services/Content/ContentQueries';
import { SearchIcon } from '@patternfly/react-icons';
import useDebounce from '../../../../Hooks/useDebounce';
import EmptyPackageState from './components/EmptyPackageState';
import { useNavigate, useParams } from 'react-router-dom';
import useRootPath from '../../../../Hooks/useRootPath';
import { useAppContext } from '../../../../middleware/AppContext';

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

const perPageKey = 'packagePerPage';

export default function PackageModal() {
  const { contentOrigin } = useAppContext();
  const classes = useStyles();
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
    // Save this value through page refresh for use on next reload
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
        defaultDirection: 'asc', // starting sort direction when first sorting a column. Defaults to 'asc'
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
    <Modal
      key={uuid}
      position='top'
      hasNoBodyWrapper
      aria-label='RPM package modal'
      ouiaId='rpm_package_modal'
      ouiaSafe={fetchingOrLoading}
      variant={ModalVariant.medium}
      title='Packages'
      description={<p className={classes.description}>View list of packages</p>}
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
      </InnerScrollContainer>
    </Modal>
  );
}
