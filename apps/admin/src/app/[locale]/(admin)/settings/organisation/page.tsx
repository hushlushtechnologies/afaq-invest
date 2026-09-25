import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge, Card, CardHeader, InfoCard } from '@afaq/ui';
import { SettingsSectionPage } from '@/components/settings/settings-section';

/** Administrators only — Sprint 3 enforces that with real permissions. */
export default async function OrganisationSettingsPage(): Promise<ReactNode> {
  const t = await getTranslations('settings');

  const cards = ['details', 'team', 'branding'] as const;

  return (
    <SettingsSectionPage
      title={t('sections.organisation.title')}
      description={t('sections.organisation.description')}
    >
      <InfoCard tone="warning">{t('sections.organisation.adminOnly')}</InfoCard>
      {cards.map((card) => (
        <Card key={card}>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                {t(`sections.organisation.${card}.title`)}
                <Badge size="sm" variant="neutral">
                  {t('comingInSprint3')}
                </Badge>
              </span>
            }
            description={t(`sections.organisation.${card}.description`)}
          />
        </Card>
      ))}
    </SettingsSectionPage>
  );
}
