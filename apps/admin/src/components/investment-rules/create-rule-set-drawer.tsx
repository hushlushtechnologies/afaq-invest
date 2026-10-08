'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { ROI_BASES, RULE_SET_SCOPES, type RoiBasis, type RuleSetScope } from '@afaq/types';
import {
  Button,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Input,
  Select,
  Textarea,
} from '@afaq/ui';
import { useRouter } from '@/i18n/navigation';
import { useCompanyList } from '@/lib/companies/use-companies';
import { useCreateRuleSet } from '@/lib/investment-rules/use-investment-rule-mutations';

/**
 * Starting a draft ladder.
 *
 * Also how a live ladder is changed: opened with `fromRuleSet`, it copies that
 * version's tiers into a new draft, which is then edited and published. The
 * original keeps serving investors the whole time and is archived at the
 * moment the new one goes out, not before.
 */
export function CreateRuleSetDrawer({
  open,
  onClose,
  fromRuleSet,
}: {
  open: boolean;
  onClose: () => void;
  /** Copy this version's tiers, and inherit its scope and basis. */
  fromRuleSet?: {
    id: string;
    name: string;
    version: number;
    scope: RuleSetScope;
    companyId: string | null;
    roiBasis: RoiBasis;
  };
}): ReactNode {
  const t = useTranslations('investmentRules.create');
  const tBasis = useTranslations('investmentRules.basis');
  const tScope = useTranslations('investmentRules.scope');
  const tActions = useTranslations('actions');

  const router = useRouter();
  const create = useCreateRuleSet();

  // Only active companies can sensibly have their own ladder, and the list is
  // short enough to fetch whole.
  const { data: companies } = useCompanyList({ status: 'ACTIVE', pageSize: 100 });

  const [name, setName] = useState('');
  const [scope, setScope] = useState<RuleSetScope>(fromRuleSet?.scope ?? 'GLOBAL');
  const [companyId, setCompanyId] = useState(fromRuleSet?.companyId ?? '');
  const [roiBasis, setRoiBasis] = useState<RoiBasis>(fromRuleSet?.roiBasis ?? 'MONTHLY');
  const [notes, setNotes] = useState('');

  async function submit(): Promise<void> {
    const created = await create.mutateAsync({
      name: name.trim(),
      scope,
      companyId: scope === 'COMPANY' ? companyId || null : null,
      roiBasis,
      notes: notes.trim() || null,
      fromRuleSetId: fromRuleSet?.id ?? null,
    });

    close();
    // Straight into the new draft: the next thing anybody wants is to edit
    // the ladder they just copied.
    router.push(`/investments/rules/${created.id}`);
  }

  function close(): void {
    setName('');
    setScope(fromRuleSet?.scope ?? 'GLOBAL');
    setCompanyId(fromRuleSet?.companyId ?? '');
    setRoiBasis(fromRuleSet?.roiBasis ?? 'MONTHLY');
    setNotes('');
    create.reset();
    onClose();
  }

  const failure =
    create.error instanceof ApiRequestError
      ? create.error.message
      : create.error
        ? t('failed')
        : null;

  const canSubmit =
    name.trim().length >= 2 && (scope === 'GLOBAL' || companyId.length > 0) && !create.isPending;

  return (
    <Drawer
      open={open}
      onClose={close}
      side="end"
      size="md"
      title={fromRuleSet ? t('copyTitle', { name: fromRuleSet.name }) : t('title')}
      description={fromRuleSet ? t('copyDescription') : t('description')}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tActions('cancel')}
          </Button>
          <Button
            variant="gradient"
            iconStart={<Layers />}
            loading={create.isPending}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        {fromRuleSet ? (
          <InfoCard tone="info">
            {t('copyNote', { name: fromRuleSet.name, version: fromRuleSet.version })}
          </InfoCard>
        ) : null}

        <FormField required>
          <FormLabel>{t('name')}</FormLabel>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('namePlaceholder')}
          />
          <FormDescription>{t('nameHelp')}</FormDescription>
        </FormField>

        <FormField required>
          <FormLabel>{t('scope')}</FormLabel>
          <Select
            value={scope}
            onChange={(event) => setScope(event.target.value as RuleSetScope)}
            options={RULE_SET_SCOPES.map((value) => ({ value, label: tScope(value) }))}
          />
          <FormDescription>{t('scopeHelp')}</FormDescription>
        </FormField>

        {scope === 'COMPANY' ? (
          <FormField required>
            <FormLabel>{t('company')}</FormLabel>
            <Select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              options={[
                { value: '', label: t('chooseCompany') },
                ...(companies?.items ?? []).map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
            />
            <FormDescription>{t('companyHelp')}</FormDescription>
          </FormField>
        ) : null}

        <FormField required>
          <FormLabel>{t('basis')}</FormLabel>
          <Select
            value={roiBasis}
            onChange={(event) => setRoiBasis(event.target.value as RoiBasis)}
            options={ROI_BASES.map((value) => ({ value, label: tBasis(value) }))}
          />
          {/* The one setting people get wrong, so it says what it means rather
              than assuming "monthly" is obvious. */}
          <FormDescription>{t('basisHelp')}</FormDescription>
        </FormField>

        <FormField>
          <FormLabel>{t('notes')}</FormLabel>
          <Textarea
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('notesPlaceholder')}
          />
          <FormDescription>{t('notesHelp')}</FormDescription>
        </FormField>
      </div>
    </Drawer>
  );
}
