import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, InfoCard } from '@afaq/ui';
import { SessionActions } from '@/components/settings/session-actions';
import { SettingsSectionPage } from '@/components/settings/settings-section';
import { Link } from '@/i18n/navigation';

/**
 * Security settings.
 *
 * Changing a password and ending sessions work today. Two-factor
 * verification and the list of recent sign-ins arrive later and say so.
 */
export default async function SecuritySettingsPage(): Promise<ReactNode> {
  const t = await getTranslations('settings');

  return (
    <SettingsSectionPage
      title={t('sections.security.title')}
      description={t('sections.security.description')}
    >
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <CardHeader
            title={t('sections.security.password.title')}
            description={t('sections.security.password.description')}
          />
          <Button asChild variant="outline" size="sm">
            <Link href="/reset-password">{t('sections.security.password.action')}</Link>
          </Button>
        </div>
      </Card>

      <SessionActions />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                {t('sections.security.twoFactor.title')}
                <Badge size="sm" variant="neutral">
                  {t('comingSoon')}
                </Badge>
              </span>
            }
            description={t('sections.security.twoFactor.description')}
          />
          <Button variant="outline" size="sm" disabled>
            {t('sections.security.twoFactor.action')}
          </Button>
        </div>
      </Card>

      <InfoCard tone="neutral">{t('sections.security.historyNote')}</InfoCard>
    </SettingsSectionPage>
  );
}
