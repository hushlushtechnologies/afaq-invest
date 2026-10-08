'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { KeyRound, Pencil, Percent, ShieldOff, Wallet } from 'lucide-react';
import { annualisedRoi, type InvestmentSettings, type Locale } from '@afaq/types';
import { Button, Card, CardBody, CardHeader } from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { Can } from '@/components/auth/can';
import { EditInvestmentSettingsDrawer } from './edit-investment-settings-drawer';

/** One labelled fact, with the icon that makes it findable at a glance. */
function Fact({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
}): ReactNode {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-fg-muted">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-fg-muted">{label}</span>
        <span className="text-body text-numeric text-fg">{value}</span>
        {note ? <span className="text-caption text-fg-muted">{note}</span> : null}
      </span>
    </div>
  );
}

/**
 * The platform settings every ladder is judged against.
 *
 * Read-only here, on purpose. These four values decide whether any ladder is
 * allowed to exist, so changing them sits behind its own screen rather than
 * being editable in passing from a list — and seeing them beside the ladders
 * is what makes a rejected draft make sense.
 *
 * Takes the settings rather than fetching them: the calculator below needs
 * the same two values, and the directory fetches once so the page has one
 * loading state instead of two that resolve at different moments.
 */
export function InvestmentSettingsCard({ settings }: { settings: InvestmentSettings }): ReactNode {
  const t = useTranslations('investmentRules.settings');
  const tBasis = useTranslations('investmentRules.basis');
  const locale = useLocale() as Locale;

  const [editing, setEditing] = useState(false);

  // Shown beside the cap so a monthly figure cannot be mistaken for a yearly
  // one. 10% a month and 10% a year differ by a factor of twelve, and this is
  // the one place somebody can check which the platform means.
  const capYearly = annualisedRoi(settings.maxRoiPercent, settings.maxRoiBasis);

  return (
    <Card>
      <CardHeader
        title={t('title')}
        description={t('description')}
        action={
          <Can permission="investment_rule.manage">
            <Button
              variant="outline"
              size="sm"
              iconStart={<Pencil />}
              onClick={() => setEditing(true)}
            >
              {t('edit')}
            </Button>
          </Can>
        }
      />
      <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          icon={<Wallet className="size-4" />}
          label={t('minimum')}
          value={formatCurrency(settings.minimumInvestment, {
            locale,
            currency: settings.currency,
            whole: true,
          })}
          note={t('minimumNote')}
        />

        <Fact
          icon={<Percent className="size-4" />}
          label={t('cap')}
          value={`${settings.maxRoiPercent}% ${tBasis(settings.maxRoiBasis)}`}
          note={
            settings.maxRoiBasis === 'ANNUAL' ? undefined : t('capYearly', { percent: capYearly })
          }
        />

        <Fact
          icon={<Wallet className="size-4" />}
          label={t('currency')}
          value={settings.currency}
        />

        <Fact
          icon={
            settings.requireStepUpToPublish ? (
              <KeyRound className="size-4" />
            ) : (
              <ShieldOff className="size-4 text-danger" />
            )
          }
          label={t('stepUp')}
          value={settings.requireStepUpToPublish ? t('stepUpOn') : t('stepUpOff')}
          note={settings.requireStepUpToPublish ? t('stepUpNote') : t('stepUpOffNote')}
        />
      </CardBody>

      <EditInvestmentSettingsDrawer
        settings={settings}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </Card>
  );
}
