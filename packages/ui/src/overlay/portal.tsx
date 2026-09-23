'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useMounted } from '../hooks/use-mounted';

export interface PortalProps {
  children: ReactNode;
  /** Where to render. Defaults to the end of <body>. */
  container?: Element | null;
}

/**
 * Renders children at the end of <body>, outside the component that opened
 * them, so a parent's overflow or z-index can never clip an overlay.
 */
export function Portal({ children, container }: PortalProps): ReactNode {
  const mounted = useMounted();
  // `document` does not exist during server rendering.
  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}
