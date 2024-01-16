import { AlertVariant } from '@patternfly/react-core';
import { useState } from 'react';
import { QueryClient, useMutation, useQuery } from 'react-query';
import { cloneDeep } from 'lodash';

import {
  ContentListResponse,
  deleteContentListItem,
  getContentList,
  RepositoryParamsResponse,
  getRepositoryParams,
  AddContentListItems,
  CreateContentRequest,
  FilterData,
  validateContentListItems,
  EditContentListItem,
  EditContentRequest,
  getGpgKey,
  PackagesResponse,
  getPackages,
  getPopularRepositories,
  PopularRepositoriesResponse,
  CreateContentRequestResponse,
  ContentItem,
  introspectRepository,
  IntrospectRepositoryRequestItem,
  fetchContentItem,
  deleteContentListItems,
  Meta,
  ErrorResponse,
  getSnapshotList,
  SnapshotListResponse,
  ContentOrigin,
  getRepoConfigFile,
  triggerSnapshot,
} from './ContentApi';
import { ADMIN_TASK_LIST_KEY } from '../AdminTasks/AdminTaskQueries';
import useErrorNotification from '../../Hooks/useErrorNotification';
import useNotification from '../../Hooks/useNotification';

export const CONTENT_LIST_KEY = 'CONTENT_LIST_KEY';
export const POPULAR_REPOSITORIES_LIST_KEY = 'POPULAR_REPOSITORIES_LIST_KEY';
export const REPOSITORY_PARAMS_KEY = 'REPOSITORY_PARAMS_KEY';
export const CREATE_PARAMS_KEY = 'CREATE_PARAMS_KEY';
export const PACKAGES_KEY = 'PACKAGES_KEY';
export const LIST_SNAPSHOTS_KEY = 'PACKAGES_KEY';
export const CONTENT_ITEM_KEY = 'CONTENT_ITEM_KEY';
export const REPO_CONFIG_FILE_KEY = 'REPO_CONFIG_FILE_KEY';

const CONTENT_LIST_POLLING_TIME = 15000; // 15 seconds

export const useFetchContent = (uuids: string[]) => {
  const errorNotifier = useErrorNotification();
  return useQuery<ContentItem>([CONTENT_ITEM_KEY, ...uuids], () => fetchContentItem(uuids[0]), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) =>
      errorNotifier('Unable to find associated repository.', 'An error occurred', err),
    keepPreviousData: true,
    staleTime: 20000,
  });
};

export const usePopularRepositoriesQuery = (
  page: number,
  limit: number,
  filterData?: Partial<FilterData>,
  sortBy?: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<PopularRepositoriesResponse>(
    [POPULAR_REPOSITORIES_LIST_KEY, page, limit, sortBy, ...Object.values(filterData || {})], // NOTE: Update this if larger list!!!!
    () => getPopularRepositories(page, limit, filterData, sortBy),
    {
      keepPreviousData: true,
      staleTime: 20000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        errorNotifier('Unable to get popular repositories list', 'An error occurred', err),
    },
  );
};

export const useContentListQuery = (
  page: number,
  limit: number,
  filterData: FilterData,
  sortBy: string,
  contentOrigin: ContentOrigin = ContentOrigin.EXTERNAL,
) => {
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const errorNotifier = useErrorNotification();
  return useQuery<ContentListResponse>(
    // Below MUST match the "contentListKeyArray" seen below in the useDeleteContent.
    [CONTENT_LIST_KEY, page, limit, sortBy, contentOrigin, ...Object.values(filterData)],
    () => getContentList(page, limit, filterData, sortBy, contentOrigin),
    {
      onSuccess: (data) => {
        const containsPending = data?.data?.some(
          ({ status }) => status === 'Pending' || status === '',
        );
        if (polling && containsPending) {
          // Count each consecutive time polling occurs
          setPollCount(pollCount + 1);
        }
        if (polling && !containsPending) {
          // We were polling, but now the data is valid, we stop the count.
          setPollCount(0);
        }
        if (pollCount > 40) {
          // If polling occurs 40 times in a row, we stop it. Likely a data/kafka issue has occurred with the API.
          return setPolling(false);
        }
        // This sets the polling state based whether the data contains any "Pending" status
        return setPolling(containsPending);
      },
      onError: (err) => {
        setPolling(false);
        setPollCount(0);
        errorNotifier('Unable to get repositories list', 'An error occurred', err);
      },
      refetchInterval: polling ? CONTENT_LIST_POLLING_TIME : undefined,
      refetchIntervalInBackground: false, // This prevents endless polling when our app isn't the focus tab in a browser
      refetchOnWindowFocus: polling, // If polling and navigate to another tab, on refocus, we want to poll once more. (This is based off of the stalestime below)
      keepPreviousData: true,
      staleTime: 20000,
    },
  );
};

export const useAddContentQuery = (queryClient: QueryClient, request: CreateContentRequest) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => AddContentListItems(request.filter((item) => !!item)), {
    onSuccess: (data: CreateContentRequestResponse) => {
      const hasPending = (data as ContentItem[]).some(({ status }) => status === 'Pending');

      notify({
        variant: AlertVariant.success,
        title:
          request?.length > 1
            ? `${request?.length} custom repositories added`
            : `Custom repository "${request?.[0]?.name}" added`,
        description: hasPending
          ? 'Repository introspection in progress'
          : 'Repository introspection data already available',
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier('Error adding items to content list', 'An error occurred', err);
    },
  });
};

export const useAddPopularRepositoryQuery = (
  queryClient: QueryClient,
  request: CreateContentRequest,
  page: number,
  perPage: number,
  filterData?: FilterData,
) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  const popularRepositoriesKeyArray = [
    POPULAR_REPOSITORIES_LIST_KEY,
    page,
    perPage,
    undefined,
    ...Object.values(filterData || {}),
  ];
  const filteredRequest = request.filter((item) => !!item);
  return useMutation(() => AddContentListItems(filteredRequest), {
    onMutate: async () => {
      const { name } = filteredRequest[0];
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(popularRepositoriesKeyArray);
      // Snapshot the previous value
      const previousPopularData: Partial<PopularRepositoriesResponse> =
        queryClient.getQueryData(popularRepositoriesKeyArray) || {};

      queryClient.setQueryData(popularRepositoriesKeyArray, () => ({
        ...previousPopularData,
        data: previousPopularData.data?.map((data) => {
          if (name === data.suggested_name && !data.uuid) {
            return { ...data, uuid: 'temp', existing_name: name };
          }
          return data;
        }),
      }));
      return { previousData: previousPopularData };
    },
    onSuccess: (data: CreateContentRequestResponse) => {
      const hasPending = (data as ContentItem[]).some(({ status }) => status === 'Pending');
      notify({
        variant: AlertVariant.success,
        title: `Custom repository "${data?.[0]?.name}" added`,
        description: hasPending
          ? 'Repository introspection in progress'
          : 'Repository introspection data already available',
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    onError: (err, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: PopularRepositoriesResponse;
        };
        queryClient.setQueryData(popularRepositoriesKeyArray, previousData);
      }
      errorNotifier('Error adding item from popularRepo', 'An error occurred', err);
    },
  });
};

export const useEditContentQuery = (queryClient: QueryClient, request: EditContentRequest) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => EditContentListItem(request[0]), {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: `Successfully edited ${request.length} ${request.length > 1 ? 'items' : 'item'}`,
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier('Error editing items on content list', 'An error occurred', err);
    },
  });
};

export const useValidateContentList = () => {
  const errorNotifier = useErrorNotification();
  return useMutation((request: CreateContentRequest) => validateContentListItems(request), {
    onError: (err) => {
      errorNotifier('Error validating form fields', 'An error occurred', err);
    },
  });
};

export const useDeletePopularRepositoryMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  filterData?: FilterData,
) => {
  const popularRepositoriesKeyArray = [
    POPULAR_REPOSITORIES_LIST_KEY,
    page,
    perPage,
    undefined,
    ...Object.values(filterData || {}),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(deleteContentListItem, {
    onMutate: async (uuid: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(popularRepositoriesKeyArray);
      // Snapshot the previous value
      const previousPopularData: Partial<PopularRepositoriesResponse> =
        queryClient.getQueryData(popularRepositoriesKeyArray) || {};

      queryClient.setQueryData(popularRepositoriesKeyArray, () => ({
        ...previousPopularData,
        data: previousPopularData.data?.map((data) => {
          if (data.uuid === uuid) {
            return { ...data, uuid: undefined };
          }
          return data;
        }),
      }));
      // Return a context object with the snapshotted value
      return { previousData: previousPopularData, queryClient };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: PopularRepositoriesResponse;
        };
        queryClient.setQueryData(popularRepositoriesKeyArray, previousData);
      }
      errorNotifier('Unable to delete the given repository.', 'An error occurred', err);
    },
  });
};

export const useDeleteContentItemMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  filterData?: FilterData,
  contentOrigin?: ContentOrigin,
  sortString?: string,
) => {
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    page,
    perPage,
    sortString,
    contentOrigin,
    ...Object.values(filterData || {}),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(deleteContentListItem, {
    onMutate: async (uuid: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<ContentListResponse> =
        queryClient.getQueryData(contentListKeyArray) || {};

      // Optimistically update to the new value
      queryClient.setQueryData(contentListKeyArray, () => ({
        ...previousData,
        data: previousData.data?.filter((data) => uuid !== data.uuid),
        meta: previousData.meta
          ? {
              ...previousData.meta,
              count: previousData.meta.count ? previousData.meta.count - 1 : 1,
            }
          : undefined,
      }));
      // Return a context object with the snapshotted value
      return { previousData, queryClient };
    },
    onSuccess: (_data, _variables, context) => {
      // Update all of the existing calls "count" to prevent number jumping on pagination
      const { previousData } = context as {
        previousData: ContentListResponse;
      };
      queryClient.setQueriesData(CONTENT_LIST_KEY, (data: Partial<ContentListResponse> = {}) => {
        if (data?.meta?.count) {
          data.meta.count = previousData?.meta?.count - 1;
        }

        return data;
      });
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: ContentListResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier('Unable to delete the given repository.', 'An error occurred', err);
    },
  });
};

export const useBulkDeleteContentItemMutate = (
  queryClient: QueryClient,
  selected: Set<string>,
  page: number,
  perPage: number,
  filterData?: FilterData,
  sortString?: string,
) => {
  const uuids = Array.from(selected);
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    page,
    perPage,
    sortString,
    ...Object.values(filterData || {}),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(() => deleteContentListItems(uuids), {
    onMutate: async (checkedRepositories: Set<string>) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<ContentListResponse> =
        queryClient.getQueryData(contentListKeyArray) || {};

      const newMeta = previousData.meta
        ? {
            ...previousData.meta,
            count: previousData.meta.count ? previousData.meta.count - checkedRepositories.size : 1,
          }
        : undefined;

      // Optimistically update to the new value
      queryClient.setQueryData(contentListKeyArray, () => ({
        ...previousData,
        data: previousData.data?.filter((data) => !checkedRepositories.has(data.uuid)),
        meta: newMeta,
      }));
      // Return a context object with the snapshotted value
      return { previousData, newMeta, queryClient };
    },
    onSuccess: (_data, _variables, context) => {
      // Update all of the existing calls "count" to prevent number jumping on pagination
      const { newMeta } = context as {
        newMeta: Meta;
      };
      queryClient.setQueriesData(CONTENT_LIST_KEY, (data: Partial<ContentListResponse> = {}) => {
        if (data?.meta?.count) {
          data.meta.count = newMeta?.count;
        }
        return data;
      });
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err: { response?: { data: ErrorResponse } }, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: ContentListResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier('Error deleting items from content list', 'An error occurred', err);
    },
  });
};

export const useRepositoryParams = () =>
  useQuery<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY, getRepositoryParams, {
    keepPreviousData: true,
    staleTime: Infinity,
  });

export const useFetchGpgKey = () => {
  const errorNotifier = useErrorNotification();
  const [isLoading, setIsLoading] = useState(false);

  const fetchGpgKey = async (url: string): Promise<string> => {
    setIsLoading(true);
    let gpg_key = url;
    try {
      const data = await getGpgKey(url);
      gpg_key = data.gpg_key;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      errorNotifier('Error fetching GPG key from provided URL', 'An error occurred', err);
    }
    setIsLoading(false);
    return gpg_key;
  };

  return { fetchGpgKey, isLoading };
};

export const useGetSnapshotList = (
  uuid: string,
  page: number,
  limit: number,
  searchQuery: string,
  sortBy: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<SnapshotListResponse>(
    [LIST_SNAPSHOTS_KEY, uuid, page, limit, searchQuery, sortBy],
    () => getSnapshotList(uuid, page, limit, searchQuery, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier('Unable to find snapshots with the given UUID.', 'An error occurred', err);
      },
    },
  );
};

export const useGetPackagesQuery = (
  uuid: string,
  page: number,
  limit: number,
  searchQuery: string,
  sortBy: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<PackagesResponse>(
    [PACKAGES_KEY, uuid, page, limit, searchQuery, sortBy],
    () => getPackages(uuid, page, limit, searchQuery, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier('Unable to find packages with the given UUID.', 'An error occurred', err);
      },
    },
  );
};

export const useTriggerSnapshot = (queryClient: QueryClient) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(triggerSnapshot, {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: 'Snapshot triggered successfully',
      });
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
    },
    onError: (err) => {
      errorNotifier('Error triggering snapshot', 'An error occurred', err);
    },
  });
};

export const useIntrospectRepositoryMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  filterData?: FilterData,
  sortString?: string,
) => {
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    page,
    perPage,
    sortString,
    ...Object.values(filterData || {}),
  ];
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(introspectRepository, {
    onMutate: async (item: IntrospectRepositoryRequestItem) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<ContentListResponse> =
        queryClient.getQueryData(contentListKeyArray) || {};

      const previousStatus = previousData.data?.find((data) => item.uuid == data.uuid)?.status;
      const newData = cloneDeep(previousData);
      if (previousStatus) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        newData.data.filter((data) => item.uuid == data.uuid).at(0).status = 'Pending';
      }

      // Optimistically update to the new value
      queryClient.setQueryData(contentListKeyArray, () => ({
        ...newData,
      }));
      // Return a context object with the snapshotted value
      return { previousData, queryClient };
    },
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: 'Repository introspection in progress',
      });
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: ContentListResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier('Error introspecting repository', 'An error occurred', err);
    },
  });
};

export const useGetRepoConfigFileQuery = (repo_uuid: string, snapshot_uuid: string) => {
  const errorNotifier = useErrorNotification();
  return useMutation<string>(
    [REPO_CONFIG_FILE_KEY, repo_uuid, snapshot_uuid],
    async () => await getRepoConfigFile(repo_uuid, snapshot_uuid),
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier('Unable to find config.repo with the given UUID.', 'An error occurred', err);
      },
    },
  );
};
