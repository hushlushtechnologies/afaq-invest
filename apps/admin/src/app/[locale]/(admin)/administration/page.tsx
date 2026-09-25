import type { ReactNode } from 'react';
import { ModuleRedirect } from '@/components/shell/module-redirect';

/**
 * /administration has no page of its own — it opens the first section this
 * person can actually use.
 *
 * Which section that is depends on their permissions, which only the browser
 * knows, so the choice is made there rather than redirected on the server to
 * a tab they may not be allowed to open.
 */
export default function AdministrationPage(): ReactNode {
  return <ModuleRedirect module="administration" />;
}
