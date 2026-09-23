import type { Ref, RefCallback } from 'react';

/**
 * Combines several refs into one, so a component can keep its own reference
 * to a DOM element while still passing the caller's ref (for example
 * React Hook Form's `register`) through.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}
