import {
  Bullseye,
  Button,
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  Spinner,
  Stack,
  StackItem,
  Text,
  TextArea,
  Title,
} from '@patternfly/react-core';

import { global_Color_100 } from '@patternfly/react-tokens';
import { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Hide from '../../../../components/Hide/Hide';
import {
  CONTENT_ITEM_KEY,
  useFetchContent,
  useDeleteContentItemMutate,
} from '../../../../services/Content/ContentQueries';
import { useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useContentListOutletContext } from '../../ContentListTable';
import useRootPath from '../../../../Hooks/useRootPath';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
    color: global_Color_100.value,
  },
  removeButton: {
    marginRight: '36px',
    transition: 'unset!important',
  },
  textAreaContent: {
    marginTop: '8px',
    color: global_Color_100.value,
    height: '200px',
  },
});

export default function DeleteContentModal() {
  const classes = useStyles();
  const navigate = useNavigate();
  const rootPath = useRootPath();
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const {
    clearCheckedRepositories,
    deletionContext: { page, perPage, filterData, contentOrigin, sortString },
  } = useContentListOutletContext();

  const uuids = new URLSearchParams(search).get('repoUUIDS')?.split(',') || [];

  const { mutate: deleteItem, isLoading: isDeleting } = useDeleteContentItemMutate(
    queryClient,
    page,
    perPage,
    filterData,
    contentOrigin,
    sortString,
  );

  const onClose = () => navigate(rootPath);
  const onSave = async () => {
    deleteItem(data?.uuid || '');
    onClose();
    clearCheckedRepositories();
    queryClient.invalidateQueries(CONTENT_ITEM_KEY);
  };

  const { data, isError } = useFetchContent(uuids);
  const values = data ? [data] : [];

  useEffect(() => {
    if (data) {
      setIsLoading(false);
    }
    if (isError) {
      onClose();
    }
  }, [values, isError]);

  const actionTakingPlace = isDeleting || isLoading;

  return (
    <Modal
      titleIconVariant='warning'
      position='top'
      variant={ModalVariant.small}
      title='Remove repository?'
      ouiaId='delete_custom_repository'
      ouiaSafe={!actionTakingPlace}
      description={
        <Text component='p' className={classes.description}>
          Are you sure you want to remove this repository?
        </Text>
      }
      isOpen
      onClose={onClose}
      footer={
        <Stack>
          <StackItem>
            <Button
              //   className={classes.removeButton}
              key='confirm'
              ouiaId='delete_modal_confirm'
              variant='danger'
              isLoading={actionTakingPlace}
              isDisabled={actionTakingPlace}
              onClick={onSave}
            >
              Remove
            </Button>
            <Button key='cancel' variant='link' onClick={onClose} ouiaId='edit_modal_cancel'>
              Cancel
            </Button>
          </StackItem>
        </Stack>
      }
    >
      <Hide hide={!isLoading}>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </Hide>
      <Hide hide={isLoading}>
        <Grid hasGutter>
          <GridItem>
            <Title headingLevel='h6'>Name</Title>
            <Text className='pf-v5-u-color-100'>{data?.name}</Text>
          </GridItem>
          <GridItem>
            <Title headingLevel='h6'>URL</Title>
            <Text className='pf-v5-u-color-100'>{data?.url}</Text>
          </GridItem>
          <GridItem>
            <Title headingLevel='h6'>Archicture</Title>
            <Text className='pf-v5-u-color-100'>{data?.distribution_arch ?? 'Any'}</Text>
          </GridItem>
          <GridItem>
            <Title headingLevel='h6'>Versions</Title>
            <Text className='pf-v5-u-color-100'>{data?.distribution_versions ?? 'Any'}</Text>
          </GridItem>
          <GridItem>
            <Title headingLevel='h6'>GPG Key</Title>
            {!data?.gpg_key ? (
              <Text className='pf-v5-u-color-100'>None</Text>
            ) : (
              <TextArea
                aria-label='GPG Key Text'
                className={classes.textAreaContent}
                value={data.gpg_key}
              />
            )}
          </GridItem>
        </Grid>
      </Hide>
    </Modal>
  );
}
