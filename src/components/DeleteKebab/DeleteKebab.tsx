import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core/deprecated';
import { useState } from 'react';
import { useAppContext } from '../../middleware/AppContext';
import ConditionalTooltip from '../ConditionalTooltip/ConditionalTooltip';

interface Props {
  atLeastOneRepoChecked: boolean;
  numberOfReposChecked: number;
  deleteCheckedRepos: () => void;
  toggleOuiaId?: string;
  isDisabled?: boolean;
}

const DeleteKebab = ({
  atLeastOneRepoChecked,
  numberOfReposChecked,
  deleteCheckedRepos,
  toggleOuiaId,
  isDisabled,
}: Props) => {
  const { rbac } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = (isOpen: boolean) => {
    setIsOpen(isOpen);
  };

  const onFocus = () => {
    const element = document.getElementById('delete-kebab') as HTMLElement;
    element.focus();
  };

  const onSelect = () => {
    setIsOpen(false);
    onFocus();
  };

  const dropdownItems = [
    <ConditionalTooltip
      key='delete'
      content='Make a selection below to delete multiple repositories'
      show={!atLeastOneRepoChecked}
      setDisabled
    >
      <DropdownItem onClick={deleteCheckedRepos}>
        {atLeastOneRepoChecked
          ? `Remove ${numberOfReposChecked} repositories`
          : 'Remove selected repositories'}
      </DropdownItem>
    </ConditionalTooltip>,
  ];

  return (
    <Dropdown
      onSelect={onSelect}
      toggle={
        <KebabToggle
          id='delete-kebab'
          data-ouia-component-id={toggleOuiaId}
          onToggle={(_event, isOpen: boolean) => onToggle(isOpen)}
          isDisabled={!rbac?.write || isDisabled}
        />
      }
      isOpen={isOpen}
      isPlain
      dropdownItems={dropdownItems}
      direction='down'
    />
  );
};

export default DeleteKebab;
