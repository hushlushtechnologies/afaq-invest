import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, InfoCard } from '@afaq/ui';
import { SettingsSectionPage } from '@/components/settings/settings-section';

export default async function SecuritySettingsPage(): Promise<ReactNode> {
  const t = await getTranslations('settings');

  const items = ['password', 'twoFactor', 'sessions'] as const;

  return (
    <SettingsSectionPage
      title={t('sections.security.title')}
      description={t('sections.security.description')}
    >
      {items.map((item) => (
        <Card key={item}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  {t(`sections.security.${item}.title`)}
                  <Badge size="sm" variant="neutral">
                    {t('comingInSprint3')}
                  </Badge>
                </span>
              }
              description={t(`sections.security.${item}.description`)}
            />
            <Button variant="outline" size="sm" disabled>
              {t(`sections.security.${item}.action`)}
            </Button>
          </div>
        </Card>
      ))}
      <InfoCard tone="neutral">{t('sections.security.note')}</InfoCard>
    </SettingsSectionPage>
  );
}
