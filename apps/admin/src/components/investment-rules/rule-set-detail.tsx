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
 * Fetched in the browser rather than rendered on the server: the header's
 * actions change the rule set, and they should refresh what is on screen
 * without a full navigation.
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
   * Whether somebody has asked to edit — not whether the editor is open.
   *
   * Those are two different things, and conflating them is what put an effect
   * here: publishing a draft has to take the editor down, because every
   * keystroke in it would then be refused by the API, which is a confusing way
   * to find out the publish worked. That used to be `setEditing(false)` inside
   * `useEffect`, which the React Compiler rejects and which closed the editor
   * a render late.
   *
   * Derived from the status instead, so it cannot be out of step with it: a
   * rule set that is no longer a draft is not editable, whatever was asked
   * for before it was published.
   */
  const [editRequested, setEditRequested] = useState(false);
  const [copying, setCopying] = useState(false);

  const hasId = typeof id === 'string' && id.trim().length > 0;

  // With no id the query never runs, so isPending would stay true for ever and
  // the page would sit on a spinner that resolves to nothing.
  if (hasId && (isPending || settingsPending)) return <LoadingState />;

  if (!hasId || isError || !ruleSet || !settings) {
    // A 404 is a different thing from a broken request: the address is wrong,
    // and retrying will not fix it. No id at all is the same kind of wrong.
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

  const editing = editRequested && ruleSet.status === 'DRAFT';

  return (
    <div className="space-y-4">
      <Breadcrumb
        linkComponent={Link}
        items={[
          { label: t('title'), href: '/investments/rules' },
          // No href on the last item: it is where we already are.
          { label: `${ruleSet.name} v${ruleSet.version}` },
        ]}
      />

      <RuleSetHeader
        ruleSet={ruleSet}
        settings={settings}
        editing={editing}
        onToggleEdit={() => setEditRequested((current) => !current)}
        onCopy={() => setCopying(true)}
      />

      {/* The editor replaces the view rather than sitting beside it: showing
          the same ladder twice, once editable and once not, invites somebody
          to read the stale copy. */}
      {editing ? (
        <LadderEditor
          ruleSet={ruleSet}
          settings={settings}
          onSaved={() => {
            setEditRequested(false);
            void refetch();
          }}
        />
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
