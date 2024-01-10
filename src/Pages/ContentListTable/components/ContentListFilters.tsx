import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  ChipGroup,
  Flex,
  FlexItem,
  InputGroup,
  TextInput,
  InputGroupItem,
  InputGroupText,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { SelectVariant } from '@patternfly/react-core/deprecated';
import DropdownSelect from '../../../components/DropdownSelect/DropdownSelect';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { global_BackgroundColor_100 } from '@patternfly/react-tokens';
import Hide from '../../../components/Hide/Hide';
import {
  FilterData,
  ContentOrigin,
  RepositoryParamsResponse,
} from '../../../services/Content/ContentApi';
import { useQueryClient } from 'react-query';
import { REPOSITORY_PARAMS_KEY } from '../../../services/Content/ContentQueries';
import useDebounce from '../../../Hooks/useDebounce';
import { createUseStyles } from 'react-jss';
import { isEmpty } from 'lodash';
import { useAppContext } from '../../../middleware/AppContext';
import ConditionalTooltip from '../../../components/ConditionalTooltip/ConditionalTooltip';
import { useNavigate } from 'react-router-dom';
import DeleteKebab from '../../../components/DeleteKebab/DeleteKebab';

interface Props {
  isLoading?: boolean;
  setFilterData: (filterData: FilterData) => void;
  filterData: FilterData;
  atLeastOneRepoChecked: boolean;
  numberOfReposChecked: number;
  deleteCheckedRepos: () => void;
  setContentOrigin: (origin: ContentOrigin) => void;
  contentOrigin: ContentOrigin;
}

const useStyles = createUseStyles({
  chipsContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    paddingTop: '16px',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  // Needed to fix styling when "Add repositories" button is disabled
  repositoryActions: {
    display: 'flex',
    flexDirection: 'row',
  },
});

const statusValues = ['Invalid', 'Pending', 'Unavailable', 'Valid'];
export type Filters = 'Name/URL' | 'Version' | 'Architecture' | 'Status';

const ContentListFilters = ({
  isLoading,
  setFilterData,
  filterData,
  atLeastOneRepoChecked,
  numberOfReposChecked,
  deleteCheckedRepos,
  setContentOrigin,
  contentOrigin,
}: Props) => {
  const classes = useStyles();
  const { rbac, features } = useAppContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const filters = ['Name/URL', 'Version', 'Architecture', 'Status'];
  const [filterType, setFilterType] = useState<Filters>('Name/URL');
  const [versionNamesLabels, setVersionNamesLabels] = useState({});
  const [archNamesLabels, setArchNamesLabels] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [selectedArches, setSelectedArches] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const isRedHatRepository = contentOrigin === ContentOrigin.REDHAT;

  const { distribution_arches = [], distribution_versions = [] } =
    queryClient.getQueryData<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY) || {};

  const clearFilters = () => {
    setFilterType('Name/URL');
    setSearchQuery('');
    setSelectedVersions([]);
    setSelectedArches([]);
    setSelectedStatuses([]);
    setFilterData({ searchQuery: '', versions: [], arches: [], statuses: [] });
  };

  useEffect(() => {
    // If the filters get cleared at the top level, sense that and clear them here.
    if (
      filterData.arches.length === 0 &&
      filterData.versions.length === 0 &&
      filterData.statuses.length === 0 &&
      filterData.searchQuery === '' &&
      (searchQuery !== '' ||
        selectedArches.length !== 0 ||
        selectedVersions.length !== 0 ||
        selectedStatuses.length !== 0)
    ) {
      clearFilters();
    }
  }, [filterData]);

  const {
    searchQuery: debouncedSearchQuery,
    selectedVersions: debouncedSelectedVersions,
    selectedArches: debouncedSelectedArches,
    selectedStatuses: debouncedSelectedStatuses,
  } = useDebounce({
    searchQuery,
    selectedVersions,
    selectedArches,
    selectedStatuses,
  });

  const getLabels = (type: string, names: Array<string>) => {
    const namesLabels = type === 'arch' ? distribution_arches : distribution_versions;

    const labels: Array<string> = [];
    names.forEach((name) => {
      const found = namesLabels.find((v) => v.name === name);
      if (found) {
        labels.push(found.label);
      }
    });
    return labels;
  };

  useEffect(() => {
    setFilterData({
      searchQuery: debouncedSearchQuery,
      versions: getLabels('version', debouncedSelectedVersions),
      arches: getLabels('arch', debouncedSelectedArches),
      statuses: debouncedSelectedStatuses,
    });
  }, [
    debouncedSearchQuery,
    debouncedSelectedVersions,
    debouncedSelectedArches,
    debouncedSelectedStatuses,
  ]);

  const deleteItem = (id: string, chips, setChips) => {
    const copyOfChips = [...chips];
    const filteredCopy = copyOfChips.filter((chip) => chip !== id);
    setChips(filteredCopy);
  };

  useEffect(() => {
    if (
      isEmpty(versionNamesLabels) &&
      isEmpty(archNamesLabels) &&
      distribution_arches.length !== 0 &&
      distribution_versions.length !== 0
    ) {
      const arches = {};
      const versions = {};
      distribution_arches.forEach((arch) => (arches[arch.name] = arch.label));
      distribution_versions.forEach((version) => (versions[version.name] = version.label));
      setVersionNamesLabels(versions);
      setArchNamesLabels(arches);
    }
  }, [distribution_arches, distribution_versions]);

  const Filter = useMemo(() => {
    switch (filterType) {
      case 'Name/URL':
        return (
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
        );
      case 'Version':
        return (
          <DropdownSelect
            toggleAriaLabel='filter version'
            toggleId='versionSelect'
            ouiaId='filter_version'
            isDisabled={isLoading}
            options={Object.keys(versionNamesLabels)}
            variant={SelectVariant.checkbox}
            selectedProp={selectedVersions}
            setSelected={setSelectedVersions}
            placeholderText='Filter by version'
          />
        );
      case 'Architecture':
        return (
          <DropdownSelect
            toggleAriaLabel='filter architecture'
            toggleId='archSelect'
            ouiaId='filter_arch'
            isDisabled={isLoading}
            options={Object.keys(archNamesLabels)}
            variant={SelectVariant.checkbox}
            selectedProp={selectedArches}
            setSelected={setSelectedArches}
            placeholderText='Filter by architecture'
          />
        );
      case 'Status':
        return (
          <DropdownSelect
            toggleAriaLabel='filter status'
            toggleId='statusSelect'
            ouiaId='filter_status'
            isDisabled={isLoading}
            options={statusValues}
            variant={SelectVariant.checkbox}
            selectedProp={selectedStatuses}
            setSelected={setSelectedStatuses}
            placeholderText='Filter by status'
          />
        );
      default:
        return <></>;
    }
  }, [
    filterType,
    isLoading,
    searchQuery,
    versionNamesLabels,
    selectedVersions,
    archNamesLabels,
    selectedArches,
    selectedStatuses,
  ]);

  return (
    <Flex>
      <FlexItem>
        <InputGroup>
          <InputGroupItem>
            <FlexItem>
              <DropdownSelect
                toggleId='filterSelectionDropdown'
                ouiaId='filter_type'
                isDisabled={isLoading}
                options={filters}
                variant={SelectVariant.single}
                selectedProp={filterType}
                setSelected={setFilterType}
                placeholderText='filter'
                toggleIcon={<FilterIcon />}
              />
            </FlexItem>
          </InputGroupItem>
          <InputGroupItem>
            <FlexItem>{Filter}</FlexItem>
          </InputGroupItem>
        </InputGroup>
      </FlexItem>
      <Hide hide={!features?.snapshots?.accessible}>
        <FlexItem>
          <ToggleGroup aria-label='Default with single selectable'>
            <ToggleGroupItem
              text='Custom'
              buttonId='custom-repositories-toggle-button'
              data-ouia-component-id='custom-repositories-toggle'
              isSelected={contentOrigin === ContentOrigin.EXTERNAL}
              onChange={() => {
                if (contentOrigin !== ContentOrigin.EXTERNAL) {
                  setContentOrigin(ContentOrigin.EXTERNAL);
                  // clearFilters(); //This resets the filters when changing Origins if desired.
                }
              }}
            />
            <ToggleGroupItem
              text='Red Hat'
              buttonId='redhat-repositories-toggle-button'
              data-ouia-component-id='redhat-repositories-toggle'
              isSelected={contentOrigin === ContentOrigin.REDHAT}
              onChange={() => {
                if (contentOrigin !== ContentOrigin.REDHAT) {
                  setContentOrigin(ContentOrigin.REDHAT);
                  // clearFilters();//This resets the filters when changing Origins if desired.
                }
              }}
            />
          </ToggleGroup>
        </FlexItem>
      </Hide>
      <FlexItem className={classes.repositoryActions}>
        <ConditionalTooltip
          content='You do not have the required permissions to perform this action.'
          show={!rbac?.write && !isRedHatRepository}
          setDisabled
        >
          <Button
            id='createContentSourceButton'
            ouiaId='create_content_source'
            variant='primary'
            isDisabled={isLoading || isRedHatRepository}
            onClick={() => navigate('add-repository')}
          >
            Add repositories
          </Button>
        </ConditionalTooltip>
        <ConditionalTooltip
          content='You do not have the required permissions to perform this action.'
          show={!rbac?.write && !isRedHatRepository}
          setDisabled
        >
          <DeleteKebab
            isDisabled={isRedHatRepository}
            atLeastOneRepoChecked={atLeastOneRepoChecked}
            numberOfReposChecked={numberOfReposChecked}
            deleteCheckedRepos={deleteCheckedRepos}
            toggleOuiaId='custom_repositories_kebab_toggle'
          />
        </ConditionalTooltip>
      </FlexItem>
      <Hide
        hide={
          !(
            selectedVersions.length ||
            selectedArches.length ||
            selectedStatuses.length ||
            searchQuery != ''
          )
        }
      >
        <FlexItem fullWidth={{ default: 'fullWidth' }} className={classes.chipsContainer}>
          <ChipGroup categoryName='Version'>
            {selectedVersions.map((version) => (
              <Chip
                key={version}
                onClick={() => deleteItem(version, selectedVersions, setSelectedVersions)}
              >
                {version}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup categoryName='Architecture'>
            {selectedArches.map((arch) => (
              <Chip key={arch} onClick={() => deleteItem(arch, selectedArches, setSelectedArches)}>
                {arch}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup categoryName='Status'>
            {selectedStatuses.map((status) => (
              <Chip
                key={status}
                onClick={() => deleteItem(status, selectedStatuses, setSelectedStatuses)}
              >
                {status}
              </Chip>
            ))}
          </ChipGroup>
          {searchQuery !== '' && (
            <ChipGroup categoryName='Name/URL'>
              <Chip key='search_chip' onClick={() => setSearchQuery('')}>
                {searchQuery}
              </Chip>
            </ChipGroup>
          )}
          {((debouncedSearchQuery !== '' && searchQuery !== '') ||
            !!selectedVersions?.length ||
            !!selectedArches?.length ||
            !!selectedStatuses?.length) && (
            <Button className={classes.clearFilters} onClick={clearFilters} variant='link' isInline>
              Clear filters
            </Button>
          )}
        </FlexItem>
      </Hide>
    </Flex>
  );
};

export default ContentListFilters;
