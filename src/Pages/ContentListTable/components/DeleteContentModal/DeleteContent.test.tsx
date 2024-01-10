import { render } from '@testing-library/react';
import { ReactQueryTestWrapper, defaultContentItem } from '../../../../testingHelpers';
import { useFetchContent } from '../../../../services/Content/ContentQueries';
import DeleteContentModal from './DeleteContentModal';
import { ContentOrigin } from '../../../../services/Content/ContentApi';

jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: () => ({
    search: `delete-repository?${defaultContentItem.uuid}`,
  }),
}));

jest.mock('../../ContentListTable', () => ({
  useContentListOutletContext: () => ({
    clearCheckedRepositories: () => undefined,
    deletionContext: {
      page: 1,
      perPage: 21,
      filterData: undefined,
      contentOrigin: ContentOrigin.EXTERNAL,
      sortString: '',
    },
  }),
}));

jest.mock('../../../../Hooks/useRootPath', () => () => 'someUrl');

jest.mock('../../../../services/Content/ContentQueries', () => ({
  useDeleteContentItemMutate: () => ({ mutate: () => undefined, isLoading: false }),
  useFetchContent: jest.fn(),
}));

jest.mock('../../../../middleware/AppContext', () => ({ useAppContext: () => ({}) }));

it('Render Delete Modal', () => {
  const data = defaultContentItem;
  (useFetchContent as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: data,
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteContentModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText(defaultContentItem.name)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.url)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.distribution_arch)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.distribution_versions[0])).toBeInTheDocument();
  expect(queryByText('None')).not.toBeInTheDocument();
});

it('Render Delete Modal with no gpg key', () => {
  const data = defaultContentItem;
  data.gpg_key = '';
  (useFetchContent as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: data,
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteContentModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText(defaultContentItem.name)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.url)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.distribution_arch)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.distribution_versions[0])).toBeInTheDocument();
  expect(queryByText('None')).toBeInTheDocument();
});
