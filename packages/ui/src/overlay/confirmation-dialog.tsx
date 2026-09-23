'use client';

import { AlertTriangle, Info, Trash2, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@afaq/utils';

import { Button, type ButtonVariant } from '../button/button';
import { Modal } from './modal';

export type ConfirmTone = 'danger' | 'warning' | 'info';

type ToneConfig = {
  Icon: LucideIcon;
  iconClass: string;
  confirmVariant: ButtonVariant;
};

const TONES: Record<ConfirmTone, ToneConfig> = {
  danger: {
    Icon: Trash2,
    iconClass: 'bg-danger-surface text-danger',
    confirmVariant: 'danger',
  },

  warning: {
    Icon: AlertTriangle,
    iconClass: 'bg-warning-surface text-warning-strong',
    confirmVariant: 'primary',
  },

  info: {
    Icon: Info,
    iconClass: 'bg-info-surface text-info',
    confirmVariant: 'primary',
  },
};

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;

  /**
   * Can be async.
   * The dialog stays open and shows a loading state until it finishes.
   */
  onConfirm: () => void | Promise<void>;

  title: ReactNode;
  message: ReactNode;

  tone?: ConfirmTone;

  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  tone = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmationDialogProps): ReactNode {
  const [pending, setPending] = useState(false);

  const { Icon, iconClass, confirmVariant } = TONES[tone];

  async function handleConfirm(): Promise<void> {
    setPending(true);

    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep the dialog open so the user can retry or cancel.
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      hideCloseButton
      dismissible={!pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} data-autofocus>
            {cancelLabel}
          </Button>

          <Button variant={confirmVariant} loading={pending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5',
            iconClass,
          )}
        >
          <Icon />
        </span>

        <div className="min-w-0 pt-1.5">{message}</div>
      </div>
    </Modal>
  );
}
