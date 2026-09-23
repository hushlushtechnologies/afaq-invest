'use client';

import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';

export type OverlayPlacement = Placement;

export interface FloatingPositionOptions {
  /** Preferred side. 'start'/'end' alignments follow reading direction. */
  placement?: OverlayPlacement;
  /** Gap between the trigger and the panel, in pixels. */
  gap?: number;
  /** Limit the panel's height to the space available, so long menus scroll. */
  fitHeight?: boolean;
}

/**
 * Positions a floating panel next to its trigger and keeps it on screen:
 * flips to the other side near an edge, slides inwards when it would overflow,
 * and follows the trigger while the page scrolls or resizes.
 */
export function useFloatingPosition(
  open: boolean,
  { placement = 'bottom-start', gap = 6, fitHeight = false }: FloatingPositionOptions = {},
) {
  return useFloating({
    open,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(gap),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      ...(fitHeight
        ? [
            size({
              padding: 8,
              apply({ availableHeight, elements }) {
                elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px`;
              },
            }),
          ]
        : []),
    ],
  });
}
