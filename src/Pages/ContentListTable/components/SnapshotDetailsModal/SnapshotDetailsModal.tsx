import {
  Button,
  Grid,
  Modal,
  ModalVariant,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core';
import { InnerScrollContainer } from '@patternfly/react-table';
import { ContentOrigin } from '../../../../services/Content/ContentApi';
import { useNavigate, useParams } from 'react-router-dom';
import useRootPath from '../../../../Hooks/useRootPath';
import { useAppContext } from '../../../../middleware/AppContext';
import { useState } from 'react';
import { SnapshotPackagesTab } from './Tabs/SnapshotPackagesTab';
import { createUseStyles } from 'react-jss';
import { SnapshotSelector } from './SnapshotsSelector';

const useStyles = createUseStyles({
  modalBody: {
    padding: '24px 24px 0 24px',
  },
  topContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '24px 0',
  },
});

export default function SnapshotDetailsModal() {
  const { contentOrigin } = useAppContext();
  const classes = useStyles();
  const { repoUUID, snapshotUUID } = useParams();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);

  const handleTabClick = (
    _: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  const onClose = () =>
    navigate(rootPath + (contentOrigin === ContentOrigin.REDHAT ? `?origin=${contentOrigin}` : ''));

  const onBackClick = () => navigate(rootPath + `/${repoUUID}/snapshots`);

  return (
    <Modal
      key={snapshotUUID}
      position='top'
      hasNoBodyWrapper
      aria-label='snapshot details modal'
      ouiaId='snapshot_details_modal'
      //   ouiaSafe={fetchingOrLoading}
      variant={ModalVariant.large}
      title='Snapshot detail'
      isOpen
      onClose={onClose}
      footer={
        <Button key='close' variant='secondary' onClick={onClose}>
          Close
        </Button>
      }
    >
      <InnerScrollContainer>
        <Stack className={classes.modalBody}>
          <StackItem className={classes.topContainer}>
            <SnapshotSelector />
            <Button variant='secondary' onClick={onBackClick}>
              View all snapshots
            </Button>
          </StackItem>
          <StackItem>
            <Tabs
              activeKey={activeTabKey}
              onSelect={handleTabClick}
              aria-label='Snapshot detail tabs'
            >
              <Tab
                eventKey={0}
                title={<TabTitleText>Packages</TabTitleText>}
                aria-label='Snapshot package detail tab'
              >
                <SnapshotPackagesTab />
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </InnerScrollContainer>
    </Modal>
  );
}
