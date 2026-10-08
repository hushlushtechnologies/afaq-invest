'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Card, CardBody, InfoCard, Skeleton } from '@afaq/ui';
import { PermissionGate } from '@/components/auth/permission-gate';
import { useInvestmentSettings } from '@/lib/investment-rules/use-investment-rules';
import { InvestmentSettingsCard } from './investment-settings-card';
import { RuleSetsTable } from './rule-sets-table';
import { TierCalculator } from './tier-calculator';

/**
 * Investment rules, behind their permission.
 *
 * The order is deliberate: the settings, then the calculator, then the
 * ladders. The settings are what every ladder is judged against, so a draft
 * that will not publish makes sense only once you have seen them; the
 * calculator is how anybody actually checks the rules are right, so it sits
 * above the list rather than buried at the bottom.
 *
 * The gate handles the refusal, so every page in the app says the same thing
 * in the same words when somebody arrives where they should not be — and
 * something different again when it could not find out.
 */
export function InvestmentRulesDirectory(): ReactNode {
  return (
    <PermissionGate permission="investment_rule.view">
      <InvestmentRulesBody />
    </PermissionGate>
  );
}

function InvestmentRulesBody(): ReactNode {
  const t = useTranslations('investmentRules.settings');

  // Fetched once here and passed down. Both the card and the calculator need
  // the currency and the minimum, and two components fetching the same thing
  // gives the page two loading states that settle at different moments.
  const { data: settings, isPending, isError } = useInvestmentSettings();

  return (
    <div className="space-y-6">
      {isPending ? (
        <Card>
          <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : isError || !settings ? (
        <InfoCard tone="danger">{t('loadError')}</InfoCard>
      ) : (
        <>
          <InvestmentSettingsCard settings={settings} />
          <TierCalculator
            currency={settings.currency}
            minimumInvestment={settings.minimumInvestment}
          />
        </>
      )}

      {/* Always rendered: the ladder list does not depend on the settings, and
          hiding it behind their failure would make one broken request look
          like an empty platform. */}
      <RuleSetsTable />
    </div>
  );
}
