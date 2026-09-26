'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from '@afaq/ui';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AuditLogTable } from './audit-log-table';
import { SignInActivityTable } from './sign-in-activity-table';

/**
 * The two trails, behind one permission.
 *
 * Switched rather than shown together: they answer different questions, and
 * a few meaningful changes would be lost among thousands of sign-ins.
 */
export function AuditViewer(): ReactNode {
  const t = useTranslations('audit');
  const [view, setView] = useState<'changes' | 'signIns'>('changes');

  return (
    <PermissionGate permission="audit.view">
      <div className="space-y-4">
        <Tabs value={view} onValueChange={(value) => setView(value as 'changes' | 'signIns')}>
          <TabList label={t('viewLabel')}>
            <Tab value="changes">{t('changesTab')}</Tab>
            <Tab value="signIns">{t('signInsTab')}</Tab>
          </TabList>

          {/* Each panel keeps its own filters and page while the other is
              open, so switching back does not lose somebody's place. */}
          <TabPanel value="changes">
            <AuditLogTable />
          </TabPanel>
          <TabPanel value="signIns">
            <SignInActivityTable />
          </TabPanel>
        </Tabs>
      </div>
    </PermissionGate>
  );
}
