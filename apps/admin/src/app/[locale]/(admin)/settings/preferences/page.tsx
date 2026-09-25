'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LOCALES } from '@afaq/types';
import { Card, CardHeader, Divider, ThemeSelector } from '@afaq/ui';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SettingsSectionPage } from '@/components/settings/settings-section';

/** Theme and language work here for real — both are already built. */
export default function PreferencesSettingsPage(): ReactNode {
  const t = useTranslations('settings');
  const tTheme = useTranslations('theme');

  return (
    <SettingsSectionPage
      title={t('sections.preferences.title')}
      description={t('sections.preferences.description')}
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardHeader
            title={t('sections.preferences.theme')}
            description={t('sections.preferences.themeDescription')}
          />
          <ThemeSelector groupLabel={tTheme('group')} />
        </div>
        <Divider className="my-5" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardHeader
            title={t('sections.preferences.language')}
            description={t('sections.preferences.languageDescription', {
              languages: Object.values(LOCALES)
                .map((locale) => locale.nativeLabel)
                .join(' · '),
            })}
          />
          <LanguageSwitcher variant="full" />
        </div>
      </Card>
    </SettingsSectionPage>
  );
}
