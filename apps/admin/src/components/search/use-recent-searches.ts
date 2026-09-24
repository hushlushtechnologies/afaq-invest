'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'afaq-recent-searches';
const MAX_ITEMS = 5;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    // Private browsing and storage limits both throw; recent searches are a
    // convenience, so failing quietly is the right behaviour.
    return [];
  }
}

/**
 * The last few things this person searched for, kept in their own browser.
 * Nothing is sent anywhere — these are convenience only.
 */
export function useRecentSearches(): {
  recent: string[];
  remember: (term: string) => void;
  clear: () => void;
} {
  // Read once, when the hook first runs. The dialog only renders in the
  // browser, so there is no server render to disagree with.
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : read(),
  );

  const persist = useCallback((items: string[]) => {
    setRecent(items);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore — the list still works for this session.
    }
  }, []);

  const remember = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return;
      const next = [trimmed, ...read().filter((item) => item !== trimmed)].slice(0, MAX_ITEMS);
      persist(next);
    },
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { recent, remember, clear };
}
