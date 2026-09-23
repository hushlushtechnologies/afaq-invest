'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@afaq/utils';
import { useFormField } from './form-field-context';

export interface FormDescriptionProps {
  children: ReactNode;
  className?: string;
}

/** Helper text under a control. Screen readers read it when the control is focused. */
export function FormDescription({ children, className }: FormDescriptionProps): ReactNode {
  const field = useFormField();
  const setHasDescription = field?.setHasDescription;

  useEffect(() => {
    if (!setHasDescription) return;
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p id={field?.descriptionId} className={cn('text-caption text-fg-muted', className)}>
      {children}
    </p>
  );
}
