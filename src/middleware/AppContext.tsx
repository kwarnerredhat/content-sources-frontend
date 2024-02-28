import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Features } from '../services/Features/FeatureApi';
import { notificationsReducer } from '@redhat-cloud-services/frontend-components-notifications/redux';
import { getRegistry as _getRegistry } from '@redhat-cloud-services/frontend-components-utilities/Registry';
import PackageJson from '../../package.json';
import { useFetchFeaturesQuery } from '../services/Features/FeatureQueries';
import { fetchRBAC, Rbac } from './RbacUtils';
import { ContentOrigin } from '../services/Content/ContentApi';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

const getRegistry = _getRegistry as unknown as () => { register: ({ notifications }) => void };
const { appname } = PackageJson.insights;

export interface AppContextInterface {
  rbac?: { read: boolean; write: boolean };
  features: Features | null;
  isFetchingFeatures: boolean;
  contentOrigin: ContentOrigin;
  setContentOrigin: (contentOrigin: ContentOrigin) => void;
}
export const AppContext = createContext({} as AppContextInterface);

export const ContextProvider = ({ children }: { children: ReactNode }) => {
  const [rbac, setRbac] = useState<Rbac | undefined>(undefined);
  const [features, setFeatures] = useState<Features | null>(null);
  const chrome = useChrome();
  const [contentOrigin, setContentOrigin] = useState<ContentOrigin>(ContentOrigin.EXTERNAL);
  const { fetchFeatures, isLoading: isFetchingFeatures } = useFetchFeaturesQuery();

  useEffect(() => {
    // Get chrome and register app
    const registry = getRegistry();
    registry.register({ notifications: notificationsReducer });

    if (chrome && !rbac) {
      // Get permissions and store them in context
      chrome.auth.getUser().then(async () => fetchRBAC(appname).then(setRbac));
    }

    (async () => {
      const fetchedFeatures = await fetchFeatures();
      // Disable snapshotting in prod stable
      if (chrome.isProd() && !chrome.isBeta() && fetchedFeatures?.snapshots?.accessible) {
        if (fetchedFeatures !== null && fetchedFeatures.snapshots !== undefined) {
          fetchedFeatures.snapshots.accessible = false;
        }
      }
      setFeatures(fetchedFeatures);
    })();
  }, [!!chrome]);

  return (
    <AppContext.Provider
      value={{
        rbac: rbac
          ? {
              read: rbac?.hasPermission('content-sources', 'repositories', 'read'),
              write: rbac?.hasPermission('content-sources', 'repositories', 'write'),
            }
          : undefined,
        features: features,
        isFetchingFeatures: isFetchingFeatures,
        contentOrigin,
        setContentOrigin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
