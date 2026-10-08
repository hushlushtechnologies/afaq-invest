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

export interface PublishDialogProps {
  ruleSet: RuleSetDetail;
  requiresPassword: boolean;
  open: boolean;
  onClose: () => void;
}

/**
 * Publish confirmation dialog.
 *
 * The dialog content is mounted only while open.
 * Closing it automatically discards the password,
 * reason, mutation error and other local state.
 *
 * No effect-based state reset is necessary.
 */
export function PublishDialog({
  ruleSet,
  requiresPassword,
  open,
  onClose,
}: PublishDialogProps): ReactNode {
  if (!open) {
    return null;
  }

  return (
    <PublishDialogContent
      key={ruleSet.id}
      ruleSet={ruleSet}
      requiresPassword={requiresPassword}
      onClose={onClose}
    />
  );
}

interface PublishDialogContentProps {
  ruleSet: RuleSetDetail;
  requiresPassword: boolean;
  onClose: () => void;
}

/**
 * The form exists only during an active dialog session.
 *
 * A new session starts with empty fields and a fresh
 * mutation state.
 */
function PublishDialogContent({
  ruleSet,
  requiresPassword,
  onClose,
}: PublishDialogContentProps): ReactNode {
  const t = useTranslations('investmentRules.publish');
  const tActions = useTranslations('actions');

  const publish = usePublishRuleSet();

  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  /**
   * Clear sensitive form data and close the dialog.
   *
   * This runs only from user actions or after
   * a successful publish, never from an effect.
   */
  function closeDialog(): void {
    setPassword('');
    setReason('');

    publish.reset();
    onClose();
  }

  /**
   * Prevent dismissal while publishing.
   *
   * The API request must finish before the user
   * can dismiss the confirmation.
   */
  function handleClose(): void {
    if (publish.isPending) {
      return;
    }

    closeDialog();
  }

  /**
   * Publish the current rule set.
   *
   * The API performs the actual authorization,
   * password verification and business validation.
   */
  async function submit(): Promise<void> {
    if (publish.isPending) {
      return;
    }

    if (requiresPassword && !password.trim()) {
      return;
    }

    try {
      await publish.mutateAsync({
        id: ruleSet.id,
        password: requiresPassword ? password : undefined,
        reason: reason.trim() || undefined,
      });

      closeDialog();
    } catch {
      /**
       * Preserve the mutation error so it can be
       * displayed in the InfoCard below.
       *
       * Clear the entered password after a failed
       * attempt. The user can enter it again.
       */
      setPassword('');
    }
  }

  /**
   * Prefer the API error message when available.
   */
  const failure =
    publish.error instanceof ApiRequestError
      ? publish.error.message
      : publish.error
        ? t('failed')
        : null;

  const canSubmit = !publish.isPending && (!requiresPassword || password.trim().length > 0);

  return (
    <Modal
      open={true}
      onClose={handleClose}
      size="md"
      dismissible={!publish.isPending}
      title={t('title', {
        name: ruleSet.name,
        version: ruleSet.version,
      })}
      description={t('description')}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={publish.isPending}>
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

        {/*
          Explain that publishing this rule set
          may replace the currently active ladder.
        */}
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
