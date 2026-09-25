'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Avatar, Badge, Button, Card, InfoCard, LoadingState } from '@afaq/ui';

import { SettingsSectionPage } from '@/components/settings/settings-section';
import { useCurrentUser } from '@/lib/auth/use-current-user';

export default function ProfileSettingsPage(): ReactNode {
  const t = useTranslations('settings');
  const user = useCurrentUser();

  if (!user) {
    return <LoadingState />;
  }

  const rows = [
    { label: t('sections.profile.name'), value: user.name },
    { label: t('sections.profile.email'), value: user.email },
    { label: t('sections.profile.role'), value: user.roleLabel },
  ];

  return (
    <SettingsSectionPage
      title={t('sections.profile.title')}
      description={t('sections.profile.description')}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-h5 text-fg">{user.name}</p>
            <Badge size="sm" variant="primary" className="mt-1.5">
              {user.roleLabel}
            </Badge>
          </div>
          <Button variant="outline" disabled>
            {t('sections.profile.changePhoto')}
          </Button>
        </div>
        <dl className="mt-6 divide-y divide-border-subtle border-t border-border-subtle">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-2 py-3">
              <dt className="w-40 text-body-small text-fg-muted">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-body-small text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <InfoCard tone="neutral">{t('editableNote')}</InfoCard>
    </SettingsSectionPage>
  );
}
