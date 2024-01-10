import { QueryClient, QueryClientProvider } from 'react-query';
import {
  ContentItem,
  Links,
  Meta,
  PopularRepository,
  RepositoryParamsResponse,
  SnapshotItem,
  ValidationResponse,
} from './services/Content/ContentApi';
import { AdminTask } from './services/AdminTasks/AdminTaskApi';

const queryClient = new QueryClient({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  logger: {
    log: console.log,
    warn: console.warn,
    // ✅ no more errors on the console with tests
    error: () => null,
  },
  defaultOptions: {
    queries: {
      // ✅ turns retries off (prevents testing timeouts)
      retry: false,
    },
  },
});

interface Props {
  children: React.ReactNode;
}

export const ReactQueryTestWrapper = ({ children }: Props) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export const testRepositoryParamsResponse: RepositoryParamsResponse = {
  distribution_versions: [
    {
      name: 'Any OS version',
      label: 'any',
    },
    {
      name: 'el7',
      label: '7',
    },
    {
      name: 'el8',
      label: '8',
    },
    {
      name: 'el9',
      label: '9',
    },
  ],
  distribution_arches: [
    { name: 'Any architecture', label: 'any' },
    {
      name: 'x86_64',
      label: 'x86_64',
    },
    {
      name: 's390x',
      label: 's390x',
    },
    {
      name: 'ppc64le',
      label: 'ppc64le',
    },
    {
      name: 'aarch64',
      label: 'aarch64',
    },
  ],
};

export const defaultValidationErrorData: ValidationResponse = [
  {
    name: {
      skipped: false,
      valid: true,
      error: '',
    },
    url: {
      skipped: false,
      valid: false,
      error: 'URL cannot be blank',
      http_code: 0,
      metadata_present: false,
      metadata_signature_present: false,
    },
  },
];

export const passingValidationErrorData: ValidationResponse = [
  {
    name: {
      skipped: false,
      valid: true,
      error: '',
    },
    gpg_key: {
      skipped: false,
      valid: true,
      error: '',
    },
    url: {
      skipped: false,
      valid: true,
      error: '',
      http_code: 200,
      metadata_present: true,
      metadata_signature_present: true,
    },
  },
];

export const defaultPopularRepository: PopularRepository = {
  uuid: '',
  existing_name: '',
  suggested_name: 'EPEL 9 Everything x86_64',
  url: 'https://download-i2.fedoraproject.org/pub/epel/9/Everything/x86_64/',
  distribution_versions: ['9'],
  distribution_arch: 'x86_64',
  gpg_key:
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQINBGE3mOsBEACsU+XwJWDJVkItBaugXhXIIkb9oe+7aadELuVo0kBmc3HXt/Yp\nCJW9hHEiGZ6z2jwgPqyJjZhCvcAWvgzKcvqE+9i0NItV1rzfxrBe2BtUtZmVcuE6\n2b+SPfxQ2Hr8llaawRjt8BCFX/ZzM4/1Qk+EzlfTcEcpkMf6wdO7kD6ulBk/tbsW\nDHX2lNcxszTf+XP9HXHWJlA2xBfP+Dk4gl4DnO2Y1xR0OSywE/QtvEbN5cY94ieu\nn7CBy29AleMhmbnx9pw3NyxcFIAsEZHJoU4ZW9ulAJ/ogttSyAWeacW7eJGW31/Z\n39cS+I4KXJgeGRI20RmpqfH0tuT+X5Da59YpjYxkbhSK3HYBVnNPhoJFUc2j5iKy\nXLgkapu1xRnEJhw05kr4LCbud0NTvfecqSqa+59kuVc+zWmfTnGTYc0PXZ6Oa3rK\n44UOmE6eAT5zd/ToleDO0VesN+EO7CXfRsm7HWGpABF5wNK3vIEF2uRr2VJMvgqS\n9eNwhJyOzoca4xFSwCkc6dACGGkV+CqhufdFBhmcAsUotSxe3zmrBjqA0B/nxIvH\nDVgOAMnVCe+Lmv8T0mFgqZSJdIUdKjnOLu/GRFhjDKIak4jeMBMTYpVnU+HhMHLq\nuDiZkNEvEEGhBQmZuI8J55F/a6UURnxUwT3piyi3Pmr2IFD7ahBxPzOBCQARAQAB\ntCdGZWRvcmEgKGVwZWw5KSA8ZXBlbEBmZWRvcmFwcm9qZWN0Lm9yZz6JAk4EEwEI\nADgWIQT/itE0RZcQbs6BO5GKOHK/MihGfAUCYTeY6wIbDwULCQgHAgYVCgkICwIE\nFgIDAQIeAQIXgAAKCRCKOHK/MihGfFX/EACBPWv20+ttYu1A5WvtHJPzwbj0U4yF\n3zTQpBglQ2UfkRpYdipTlT3Ih6j5h2VmgRPtINCc/ZE28adrWpBoeFIS2YAKOCLC\nnZYtHl2nCoLq1U7FSttUGsZ/t8uGCBgnugTfnIYcmlP1jKKA6RJAclK89evDQX5n\nR9ZD+Cq3CBMlttvSTCht0qQVlwycedH8iWyYgP/mF0W35BIn7NuuZwWhgR00n/VG\n4nbKPOzTWbsP45awcmivdrS74P6mL84WfkghipdmcoyVb1B8ZP4Y/Ke0RXOnLhNe\nCfrXXvuW+Pvg2RTfwRDtehGQPAgXbmLmz2ZkV69RGIr54HJv84NDbqZovRTMr7gL\n9k3ciCzXCiYQgM8yAyGHV0KEhFSQ1HV7gMnt9UmxbxBE2pGU7vu3CwjYga5DpwU7\nw5wu1TmM5KgZtZvuWOTDnqDLf0cKoIbW8FeeCOn24elcj32bnQDuF9DPey1mqcvT\n/yEo/Ushyz6CVYxN8DGgcy2M9JOsnmjDx02h6qgWGWDuKgb9jZrvRedpAQCeemEd\nfhEs6ihqVxRFl16HxC4EVijybhAL76SsM2nbtIqW1apBQJQpXWtQwwdvgTVpdEtE\nr4ArVJYX5LrswnWEQMOelugUG6S3ZjMfcyOa/O0364iY73vyVgaYK+2XtT2usMux\nVL469Kj5m13T6w==\n=Mjs/\n-----END PGP PUBLIC KEY BLOCK-----',
  metadata_verification: false,
};

export const defaultContentItem: ContentItem = {
  uuid: '053603c7-6ef0-4abe-8542-feacb8f7d575',
  name: 'SteveTheRepo',
  package_count: 100,
  url: 'https://stevetheRepo.org/epel/9',
  status: 'Pending',
  account_id: '',
  org_id: 'acme',
  distribution_arch: 'x86_64',
  gpg_key: defaultPopularRepository.gpg_key,
  distribution_versions: ['9'],
  last_introspection_error: '',
  last_introspection_time: '2023-03-07 17:13:48.619192 -0500 EST',
  failed_introspections_count: 0,
  metadata_verification: false,
  snapshot: false,
};

export const defaultIntrospectTask: AdminTask = {
  uuid: '2375c35b-a67a-4ac2-a989-21139433c172',
  account_id: '11593016',
  org_id: '13446804',
  typename: 'introspect',
  status: 'completed',
  queued_at: '2023-06-15T10:41:02-04:00',
  started_at: '2023-06-15T10:42:02-04:00',
  finished_at: '2023-06-15T10:43:02-04:00',
  error: 'something went wrong',
  payload: {
    URL: 'https://example.com',
  },
};

export const defaultSnapshotTask: AdminTask = {
  ...defaultIntrospectTask,
  typename: 'snapshot',
  pulp: {
    sync: {
      syncData: 'syncValue',
    },
    publication: {
      publicationData: 'publicationValue',
    },
    distribution: {
      distributionData: 'distributionValue',
    },
  },
};

export const defaultMetaItem: Meta = {
  limit: 10,
  offset: 0,
  count: 1,
};

export const defaultLinkItem: Links = {
  first:
    '/api/content-sources/v1/repositories/?arch=&limit=20&offset=0&search=&sort_by=name:asc&status=&version=',
  last: '/api/content-sources/v1/repositories/?arch=&limit=20&offset=0&search=&sort_by=name:asc&status=&version=',
};

export const defaultSnapshotItem: SnapshotItem = {
  uuid: '2375c35b-a67a-4ac2-a989-21139433c172',
  created_at: '2023-08-08T20:23:32.711372-06:00',
  distribution_path: 'b68beca3-d081-4c9f-9d8f-9868107c30e2/ea837ff5-62ed-4507-876d-2c600f55df54',
  content_counts: {
    'rpm.advisory': 3864,
    'rpm.package': 17208,
    'rpm.packagecategory': 1,
    'rpm.packageenvironment': 1,
    'rpm.packagegroup': 20,
  },
  added_counts: {
    'rpm.advisory': 3864,
    'rpm.package': 17208,
    'rpm.packagecategory': 1,
    'rpm.packageenvironment': 1,
    'rpm.packagegroup': 20,
  },
  removed_counts: {},
};

export const defaultContentItemWithSnapshot: ContentItem = {
  account_id: 'undefined',
  distribution_arch: 'x86_64',
  distribution_versions: ['el7'],
  name: 'AwesomeNamewwyylse12',
  org_id: '13446804',
  url: 'https://google.ca/wwyylse12/x86_64/el7',
  uuid: '2375c35b-a67a-4ac2-a989-21139433c172',
  package_count: 0,
  status: '',
  last_introspection_error: '',
  last_introspection_time: '',
  failed_introspections_count: 0,
  gpg_key: '',
  metadata_verification: false,
  snapshot: true,
  last_snapshot: defaultSnapshotItem,
};
