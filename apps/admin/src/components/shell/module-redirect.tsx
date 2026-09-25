'use client';

import { useEffect, type ReactNode } from 'react';
import { LoadingState } from '@afaq/ui';
import { sectionsFor } from '@/config/module-tabs';
import type { NavModule } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { useVisibleSections } from '@/lib/navigation/use-visible-sections';

/**
 * Sends someone from a module's root to the first section they can open.
 *
 * A fixed redirect would drop an auditor — who can read the audit trail but
 * not staff — onto a page they are not allowed to see, which is a confusing
 * way to greet somebody who has done nothing wrong.
 *
 * When they can open none of them, the redirect still happens: the section
 * page itself is responsible for refusing, in one place, with one message.
 */
export function ModuleRedirect({
  module,
  fallbackHref,
}: {
  module: NavModule['key'];
  fallbackHref?: string;
}): ReactNode {
  const router = useRouter();
  const { sections, loading } = useVisibleSections(module);

  useEffect(() => {
    if (loading) return;

    // Never `/${module}` as a fallback — that is this page, and replacing it
    // with itself loops forever. With nothing permitted, go to the module's
    // own first section and let that page refuse, once, with one message.
    const target =
      sections[0]?.href ?? fallbackHref ?? sectionsFor(module)[0]?.href ?? '/dashboard';
    router.replace(target);
  }, [loading, sections, router, module, fallbackHref]);

  return <LoadingState />;
}
