'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { RuleSetDetail } from '@afaq/types';
import {
  Button,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Modal,
  PasswordInput,
  Textarea,
} from '@afaq/ui';
import { usePublishRuleSet } from '@/lib/investment-rules/use-investment-rule-mutations';

/**
 * Publishing a ladder.
 *
 * The one place in the Admin Portal that asks for a password again. Publishing
 * decides what the business owes real people, and a session left open on an
 * unlocked screen should not be enough on its own.
 *
 * The password lives in this component's state for as long as the dialog is
 * open and is wiped the moment it closes — successfully or not. It is never
 * put in a query key, never cached, and never logged.
 */
export function PublishDialog({
  ruleSet,
  requiresPassword,
  open,
  onClose,
}: {
  ruleSet: RuleSetDetail;
  /** From the platform settings. False skips the password field entirely. */
  requiresPassword: boolean;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('investmentRules.publish');
  const tActions = useTranslations('actions');

  const publish = usePublishRuleSet();

  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  /**
   * Every way out of this dialog, including a failed attempt.
   *
   * This was an effect watching `open`, which the React Compiler is right to
   * reject: it wiped the password one render *after* the dialog had already
   * gone, and only if a render happened at all. Doing it in the close path
   * instead means the three ways out — dismissing, cancelling, and a
   * successful publish — all clear it before anything else runs.
   */
  function close(): void {
    setPassword('');
    setReason('');
    publish.reset();
    onClose();
  }

  async function submit(): Promise<void> {
    await publish.mutateAsync({
      id: ruleSet.id,
      password: requiresPassword ? password : undefined,
      reason: reason.trim() || undefined,
    });

    close();
  }

  // The API's own words where it has them: "That password is not correct" and
  // "This draft has no tiers yet" each tell somebody what to do next, where a
  // generic failure does not.
  const failure =
    publish.error instanceof ApiRequestError
      ? publish.error.message
      : publish.error
        ? t('failed')
        : null;

  const canSubmit = !requiresPassword || password.length > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      // Blocked while the request is in flight: publishing archives the live
      // ladder in the same transaction, and dismissing mid-flight would leave
      // somebody unsure which state they are in.
      dismissible={!publish.isPending}
      title={t('title', { name: ruleSet.name, version: ruleSet.version })}
      description={t('description')}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={publish.isPending}>
            {tActions('cancel')}
          </Button>
          <Button
            variant="gradient"
            iconStart={<Rocket />}
            loading={publish.isPending}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {t('confirm')}
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

        {/* Says plainly what is about to happen to the ladder currently live,
            because "publish" on its own does not convey that something else
            stops. */}
        <InfoCard tone="warning">{t('replaces')}</InfoCard>

        {requiresPassword ? (
          <FormField required>
            <FormLabel>{t('password')}</FormLabel>
            <PasswordInput
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FormDescription>{t('passwordHelp')}</FormDescription>
          </FormField>
        ) : (
          // Shown when the control is switched off, so nobody publishes
          // without noticing that the confirmation they expected is absent.
          <InfoCard tone="neutral">{t('noPassword')}</InfoCard>
        )}

        <FormField>
          <FormLabel>{t('reason')}</FormLabel>
          <Textarea
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('reasonPlaceholder')}
          />
          <FormDescription>{t('reasonHelp')}</FormDescription>
        </FormField>
      </div>
    </Modal>
  );
}
