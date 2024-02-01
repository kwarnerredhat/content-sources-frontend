import { fireEvent, render, waitFor } from '@testing-library/react';
import SnapshotPackageModal from './SnapshotPackageModal';
import { PackageItem } from '../../../../services/Content/ContentApi';
import { ReactQueryTestWrapper } from '../../../../testingHelpers';
import { useGetPackagesQuery } from '../../../../services/Content/ContentQueries';

const packageItem: PackageItem = {
  // Used variables
  name: 'billy-the-bob',
  version: '2.2.2',
  release: '1.2.el9',
  arch: 'x86_64',
  // Placeholders for TS
  checksum: '',
  epoch: 0,
  summary: '',
  uuid: '',
};

jest.mock('../../../../Hooks/useRootPath', () => () => 'someUrl');

jest.mock('../../../../services/Content/ContentQueries', () => ({
  useGetPackagesQuery: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({
    repoUUID: 'some-uuid',
  }),
}));

jest.mock('../../../../middleware/AppContext', () => ({
  useAppContext: () => ({ rbac: { read: true, write: true } }),
}));

it('Render 1 item', () => {
  (useGetPackagesQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [packageItem],
      meta: { count: 1, limit: 20, offset: 0 },
    },
  }));

  const { queryByText, getByText } = render(
    <ReactQueryTestWrapper>
      <SnapshotPackageModal />
    </ReactQueryTestWrapper>,
  );
  expect(queryByText('Snapshot detail')).toBeInTheDocument();
  expect(queryByText(packageItem.name)).toBeInTheDocument();
  expect(queryByText(packageItem.version)).toBeInTheDocument();
  expect(queryByText(packageItem.release)).toBeInTheDocument();
  expect(queryByText(packageItem.arch)).toBeInTheDocument();
  waitFor(() => {
    fireEvent.click(getByText('Close'));
    expect(queryByText('Snapshot detail')).toBeInTheDocument();
  });
});

// it('Clicks on package in "View All Snapshots" modal, opens new modal, and goes back to original repo', async () => {
//    (useGetPackagesQuery as jest.Mock).mockImplementation(() => ({
//      isLoading: false,
//     data: {
//        data: [packageItem],
//        meta: { count: 1, limit: 20, offset: 0 },
//     },
//   }));

//    const { getByText, queryByText } = render(
//     <ReactQueryTestWrapper>
//       <SnapshotPackageModal />
//      </ReactQueryTestWrapper>,
//   );

// });
