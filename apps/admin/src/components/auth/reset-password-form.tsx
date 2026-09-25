'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, ShieldCheck } from 'lucide-react';
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
  Stagger,
  StaggerItem,
  useMotionPreset,
} from '@afaq/ui';
import { resetPasswordSchema, type ResetPasswordInput } from '@afaq/validation';
import { useRouter } from '@/i18n/navigation';
import { toAuthErrorCode, type AuthErrorCode } from '@/lib/auth/auth-errors';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrength } from './password-strength';

/**
 * Choosing a new password.
 *
 * Reached with a session already in hand: the recovery link was exchanged for
 * one by the callback route, which is what authorises the change. There is no
 * token in this form and none in the address bar.
 */
export function ResetPasswordForm(): ReactNode {
  const t = useTranslations('auth');
  const router = useRouter();
  const panelMotion = useMotionPreset('fadeDown');

  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const password = watch('password');

  async function onSubmit(values: ResetPasswordInput): Promise<void> {
    setFailure(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setFailure(toAuthErrorCode(error));
      return;
    }

    // Anyone signed in elsewhere with the old password is signed out. If the
    // reason for the reset was someone else having the password, leaving
    // their session alive would defeat the whole exercise.
    await supabase.auth.signOut({ scope: 'others' });

    setDone(true);
  }

  if (done) {
    return (
      <motion.div {...panelMotion} className="space-y-6">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-surface text-success">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>

        <div>
          <h1 className="text-h2 text-fg">{t('reset.doneTitle')}</h1>
          <p className="mt-2 text-body-small text-fg-subtle">{t('reset.doneBody')}</p>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={() => {
            router.replace('/dashboard');
            router.refresh();
          }}
        >
          {t('reset.continue')}
        </Button>
      </motion.div>
    );
  }

  return (
    <Stagger className="space-y-6">
      <StaggerItem>
        <h1 className="text-h2 text-fg">{t('reset.title')}</h1>
        <p className="mt-2 text-body-small text-fg-subtle">{t('reset.subtitle')}</p>
      </StaggerItem>

      <AnimatePresence>
        {failure ? (
          <motion.div {...panelMotion} key={failure}>
            <InfoCard tone="danger" announce>
              {t(`errors.${failure}`)}
            </InfoCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <StaggerItem>
          <FormField error={errors.password?.message}>
            <FormLabel>{t('reset.newPassword')}</FormLabel>
            <PasswordInput autoComplete="new-password" autoFocus {...register('password')} />
            <FormDescription>{t('reset.requirements')}</FormDescription>
            <FormMessage />
          </FormField>
          <PasswordStrength value={password} />
        </StaggerItem>

        <StaggerItem>
          <FormField error={errors.confirmPassword?.message}>
            <FormLabel>{t('reset.confirmPassword')}</FormLabel>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
            <FormMessage />
          </FormField>
        </StaggerItem>

        <StaggerItem>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            loading={isSubmitting}
            iconStart={<KeyRound />}
          >
            {t('reset.submit')}
          </Button>
        </StaggerItem>
      </form>

      <StaggerItem>
        <p className="text-caption text-fg-muted">{t('reset.signsOutOthers')}</p>
      </StaggerItem>
    </Stagger>
  );
}
