'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Card, InfoCard, Switch } from '@afaq/ui';
import { SettingsSectionPage } from '@/components/settings/settings-section';

type ChannelKey = 'email' | 'inApp';
type TopicKey = 'kyc' | 'payments' | 'investments' | 'reports';

const TOPICS: readonly TopicKey[] = ['kyc', 'payments', 'investments', 'reports'];

/**
 * The switches work, but only in this browser tab — saving them is part of a
 * later sprint. The note under the list says so.
 */
export default function NotificationSettingsPage(): ReactNode {
  const t = useTranslations('settings');
  const [settings, setSettings] = useState<Record<TopicKey, Record<ChannelKey, boolean>>>({
    kyc: { email: true, inApp: true },
    payments: { email: true, inApp: true },
    investments: { email: false, inApp: true },
    reports: { email: false, inApp: false },
  });

  function toggle(topic: TopicKey, channel: ChannelKey): void {
    setSettings((current) => ({
      ...current,
      [topic]: { ...current[topic], [channel]: !current[topic][channel] },
    }));
  }

  return (
    <SettingsSectionPage
      title={t('sections.notifications.title')}
      description={t('sections.notifications.description')}
    >
      <Card padding="none">
        <ul className="divide-y divide-border-subtle">
          {TOPICS.map((topic) => (
            <li key={topic} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-body-small font-medium text-fg">
                  {t(`sections.notifications.topics.${topic}.title`)}
                </p>
                <p className="mt-0.5 text-caption text-fg-muted">
                  {t(`sections.notifications.topics.${topic}.description`)}
                </p>
              </div>
              <div className="flex shrink-0 gap-5">
                {(['inApp', 'email'] as const).map((channel) => (
                  <Switch
                    key={channel}
                    label={t(`sections.notifications.channels.${channel}`)}
                    checked={settings[topic][channel]}
                    onChange={() => toggle(topic, channel)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <InfoCard tone="neutral">{t('sections.notifications.note')}</InfoCard>
    </SettingsSectionPage>
  );
}
