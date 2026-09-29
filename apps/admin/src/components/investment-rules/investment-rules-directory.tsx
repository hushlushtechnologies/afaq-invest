'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { InvestmentSettingsCard } from './investment-settings-card';
import { RuleSetsTable } from './rule-sets-table';

/**
 * Investment rules, behind their permission.
 *
 * The settings come first and the ladders below them, in that order on
 * purpose: the minimum and the cap are what every ladder is judged against,
 * so a draft that will not publish makes sense only once you have seen them.
 *
 * The gate handles the refusal, so every page in the app says the same thing
 * in the same words when somebody arrives where they should not be — and
 * something different again when it could not find out.
 */
export function InvestmentRulesDirectory(): ReactNode {
  return (
    <PermissionGate permission="investment_rule.view">
      <div className="space-y-6">
        <InvestmentSettingsCard />
        <RuleSetsTable />
      </div>
    </PermissionGate>
  );
}
