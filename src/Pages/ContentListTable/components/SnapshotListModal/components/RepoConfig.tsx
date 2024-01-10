import { Button, Flex, FlexItem, Icon } from '@patternfly/react-core';
import { createUseStyles } from 'react-jss';
import { global_disabled_color_100 } from '@patternfly/react-tokens';

import { useGetRepoConfigFileQuery } from '../../../../../services/Content/ContentQueries';
import { CopyIcon, DownloadIcon } from '@patternfly/react-icons';

const useStyles = createUseStyles({
  text: {
    color: global_disabled_color_100.value,
    width: 'fit-content',
  },
  link: {
    padding: 0,
  },
});

interface Props {
  repoUUID: string;
  snapUUID: string;
}

const RepoConfig = ({ repoUUID, snapUUID }: Props) => {
  const classes = useStyles();

  const { mutateAsync } = useGetRepoConfigFileQuery(repoUUID, snapUUID);

  const copyConfigFile = async () => {
    const data = await mutateAsync();
    navigator.clipboard.writeText(data);
  };

  const downloadConfigFile = async () => {
    const data = await mutateAsync();
    const element = document.createElement('a');
    const file = new Blob([data], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'config.repo';
    document.body.appendChild(element);
    element.click();
  };

  return (
    <Flex>
      <FlexItem>
        <Button
          ouiaId='repo_config_file_copy_button'
          label='repo_config_file_copy_button'
          variant='link'
          className={classes.link}
          onClick={() => copyConfigFile()}
        >
          <Icon>
            <CopyIcon />
          </Icon>
        </Button>
      </FlexItem>
      <FlexItem>
        <Button
          ouiaId='repo_config_file_download_button'
          label='repo_config_file_download_button'
          variant='link'
          className={classes.link}
          onClick={() => downloadConfigFile()}
        >
          <Icon>
            <DownloadIcon />
          </Icon>
        </Button>
      </FlexItem>
    </Flex>
  );
};

export default RepoConfig;
