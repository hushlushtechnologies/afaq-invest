'use client';

import { useEffect, useState } from 'react';

/**
 * A value that settles before anything acts on it.
 *
 * Written for the tier calculator, where every keystroke in the amount box
 * would otherwise be a request: typing "500000" is six requests, five of them
 * for amounts nobody asked about, and the answers can arrive out of order.
 *
 * Returns the previous value until `delay` has passed with no further change.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);

    // Cleared on every change, so the timer only ever fires once the value has
    // stopped moving.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
