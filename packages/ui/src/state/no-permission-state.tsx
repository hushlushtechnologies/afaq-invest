import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { StateView, type StateSize } from './state-view';

export interface NoPermissionStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Usually "Go back" or "Request access". */
  actions?: ReactNode;
  size?: StateSize;
  className?: string;
}

/**
 * Shown when someone is signed in but their role doesn't allow this page or
 * action. Sprint 3's permission checks will render it.
 */
export function NoPermissionState({
  title = 'You don’t have access to this',
  description = 'Your role doesn’t include permission to view this page. If you need access, ask an administrator.',
  actions,
  size = 'md',
  className,
}: NoPermissionStateProps): ReactNode {
  return (
    <StateView
      icon={<Lock />}
      tone="warning"
      title={title}
      description={description}
      actions={actions}
      size={size}
      className={className}
    />
  );
}
