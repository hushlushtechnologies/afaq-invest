'use client';

import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../button/icon-button';
import { Dropdown, DropdownItem, DropdownSeparator } from '../overlay/dropdown';

export interface RowAction {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Draw a separator above this item — e.g. before a destructive action. */
  separated?: boolean;
}

export interface RowActionsProps {
  actions: readonly RowAction[];
  /** Include the row's name, e.g. "Actions for Ahmed Al Mansouri". */
  label: string;
}

/** The ⋯ menu at the end of a row. */
export function RowActions({ actions, label }: RowActionsProps): ReactNode {
  return (
    <Dropdown
      label={label}
      placement="bottom-end"
      trigger={<IconButton icon={<MoreHorizontal />} label={label} size="sm" className="w-8" />}
    >
      {actions.map((action) => (
        <RowActionItem key={action.label} action={action} />
      ))}
    </Dropdown>
  );
}

function RowActionItem({ action }: { action: RowAction }): ReactNode {
  return (
    <>
      {action.separated ? <DropdownSeparator /> : null}
      <DropdownItem
        icon={action.icon}
        tone={action.tone}
        disabled={action.disabled}
        onSelect={action.onSelect}
      >
        {action.label}
      </DropdownItem>
    </>
  );
}
