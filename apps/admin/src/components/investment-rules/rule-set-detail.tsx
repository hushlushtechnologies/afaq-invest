'use client';

import { ApiRequestError } from '@afaq/api-client';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Breadcrumb, Button, ErrorState, LoadingState } from '@afaq/ui';

import { PermissionGate } from '@/components/auth/permission-gate';
import { Link } from '@/i18n/navigation';
import { useInvestmentSettings, useRuleSet } from '@/lib/investment-rules/use-investment-rules';

import { CreateRuleSetDrawer } from './create-rule-set-drawer';
import { LadderEditor } from './ladder-editor';
import { LadderView } from './ladder-view';
import { RuleSetHeader } from './rule-set-header';

/**
 * One rule set's page, behind its permission.
 *
 * Fetched in the browser rather than rendered on the server:
 * the header's actions change the rule set, and they should
 * refresh what is on screen without a full navigation.
 */
export function RuleSetDetail({ id }: { id: string | undefined }): ReactNode {
  return (
    <PermissionGate permission="investment_rule.view">
      <RuleSetDetailBody id={id} />
    </PermissionGate>
  );
}

function RuleSetDetailBody({ id }: { id: string | undefined }): ReactNode {
  const t = useTranslations('investmentRules');
  const tDetail = useTranslations('investmentRules.detail');

  const { data: ruleSet, isPending, isError, error, refetch } = useRuleSet(id);

  const { data: settings, isPending: settingsPending } = useInvestmentSettings();

  /**
   * Store the ID of the rule set being edited.
   *
   * This prevents edit mode from carrying over
   * when navigating between different rule sets.
   */
  const [editingRuleSetId, setEditingRuleSetId] = useState<string | null>(null);

  const [copying, setCopying] = useState(false);

  const hasId = typeof id === 'string' && id.trim().length > 0;

  /**
   * With no ID, the query never runs.
   * Avoid showing an infinite loading state.
   */
  if (hasId && (isPending || settingsPending)) {
    return <LoadingState />;
  }

  if (!hasId || isError || !ruleSet || !settings) {
    const missing = !hasId || (error instanceof ApiRequestError && error.statusCode === 404);

    return (
      <ErrorState
        title={missing ? tDetail('missing.title') : tDetail('loadError.title')}
        description={missing ? tDetail('missing.description') : tDetail('loadError.description')}
        onRetry={missing ? undefined : () => void refetch()}
        actions={
          <Button variant="outline" asChild>
            <Link href="/investments/rules">{tDetail('backToList')}</Link>
          </Button>
        }
      />
    );
  }

  /**
   * Edit mode is derived from the current rule set.
   *
   * Only DRAFT rule sets can be edited.
   *
   * If a rule set becomes PUBLISHED or otherwise
   * leaves DRAFT status, the editor immediately
   * disappears without calling setState in an effect.
   */
  const isEditing = editingRuleSetId === ruleSet.id && ruleSet.status === 'DRAFT';

  function handleToggleEdit(): void {
    if (ruleSet?.status !== 'DRAFT') {
      return;
    }

    setEditingRuleSetId((current) => (current === ruleSet.id ? null : ruleSet.id));
  }

  function handleSaved(): void {
    setEditingRuleSetId(null);
    void refetch();
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        linkComponent={Link}
        items={[
          {
            label: t('title'),
            href: '/investments/rules',
          },
          {
            label: `${ruleSet.name} v${ruleSet.version}`,
          },
        ]}
      />

      <RuleSetHeader
        ruleSet={ruleSet}
        settings={settings}
        editing={isEditing}
        onToggleEdit={handleToggleEdit}
        onCopy={() => setCopying(true)}
      />

      {/*
        Show the editor only when the current
        rule set is a draft and editing is active.

        Otherwise, show the read-only ladder.
      */}
      {isEditing ? (
        <LadderEditor ruleSet={ruleSet} settings={settings} onSaved={handleSaved} />
      ) : (
        <LadderView ruleSet={ruleSet} settings={settings} />
      )}

      <CreateRuleSetDrawer
        open={copying}
        onClose={() => setCopying(false)}
        fromRuleSet={{
          id: ruleSet.id,
          name: ruleSet.name,
          version: ruleSet.version,
          scope: ruleSet.scope,
          companyId: ruleSet.companyId,
          roiBasis: ruleSet.roiBasis,
        }}
      />
    </div>
  );
}
