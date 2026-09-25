'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiRequestError } from '@afaq/api-client';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  PasswordInput,
} from '@afaq/ui';
import { resetPasswordSchema, type ResetPasswordInput } from '@afaq/validation';
import { useRouter } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api';
import { toAuthErrorCode, type AuthErrorCode } from '@/lib/auth/auth-errors';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from './password-strength';

/**
 * Finishing an invitation: choose a password, and the account becomes active.
 *
 * Two steps that must both succeed. The password is set with Supabase from
 * the browser — it never passes through our API — and only then does the API
 * activate the staff record. In that order, because a record marked active
 * for somebody who has no password is an account nobody can get into.
 */
export function AcceptInvitationForm({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}): ReactNode {
  const t = useTranslations('auth.acceptInvitation');
  // The Supabase failures are the same ones the sign-in and reset screens
  // report, so they share one set of words.
  const tErrors = useTranslations('auth.errors');
  const router = useRouter();

  const [failure, setFailure] = useState<AuthErrorCode | 'activationFailed' | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  async function onSubmit(values: ResetPasswordInput): Promise<void> {
    setFailure(null);
    setFailureMessage(null);

    const { error } = await createClient().auth.updateUser({ password: values.password });

    if (error) {
      setFailure(toAuthErrorCode(error));
      return;
    }

    try {
      await getApiClient().post<{ id: string }>('/auth/accept-invitation', {});
    } catch (error) {
      // The password is set either way, so they can sign in once an
      // administrator sorts out the invitation — worth saying rather than
      // leaving them to guess.
      setFailure('activationFailed');
      setFailureMessage(error instanceof ApiRequestError ? error.message : null);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-heading-4 text-fg">
          {t('title', { name: fullName.split(' ')[0] ?? '' })}
        </h1>
        <p className="text-body-small text-fg-muted">{t('subtitle', { email })}</p>
      </div>

      {failure ? (
        <InfoCard tone="danger" announce>
          {failureMessage ??
            (failure === 'activationFailed' ? t('activationFailed') : tErrors(failure))}
        </InfoCard>
      ) : null}

      <FormField required error={errors.password?.message}>
        <FormLabel>{t('password')}</FormLabel>
        <PasswordInput autoFocus autoComplete="new-password" {...register('password')} />
        <PasswordStrength value={password} />
        <FormDescription>{t('passwordHelp')}</FormDescription>
        <FormMessage />
      </FormField>

      <FormField required error={errors.confirmPassword?.message}>
        <FormLabel>{t('confirmPassword')}</FormLabel>
        <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        <FormMessage />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        iconStart={<KeyRound />}
        loading={isSubmitting}
      >
        {t('submit')}
      </Button>
    </form>
  );
}
