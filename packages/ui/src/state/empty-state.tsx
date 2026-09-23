import { Inbox, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { StateView, type StateSize } from './state-view';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Usually the button that creates the first item. */
  action?: ReactNode;
  icon?: ReactNode;
  illustration?: ReactNode;
  /**
   * 'no-data' when nothing exists yet; 'no-results' when a search or filter
   * found nothing — the two need different advice.
   */
  kind?: 'no-data' | 'no-results';
  size?: StateSize;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  illustration,
  kind = 'no-data',
  size = 'md',
  className,
}: EmptyStateProps): ReactNode {
  return (
    <StateView
      icon={icon ?? (kind === 'no-results' ? <SearchX /> : <Inbox />)}
      illustration={illustration}
      title={title}
      description={description}
      actions={action}
      size={size}
      // A search that finds nothing happens because of typing, so announce it.
      announce={kind === 'no-results' ? 'status' : 'none'}
      className={className}
    />
  );
}
