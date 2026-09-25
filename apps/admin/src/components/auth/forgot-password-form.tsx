'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  Stagger,
  StaggerItem,
  useMotionPreset,
} from '@afaq/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@afaq/validation';
import { Link } from '@/i18n/navigation';
import { toAuthErrorCode, type AuthErrorCode } from '@/lib/auth/auth-errors';
import { createClient } from '@/lib/supabase/client';

/** How long before the email can be sent again. */
const RESEND_SECONDS = 60;

export function ForgotPasswordForm(): ReactNode {
  const t = useTranslations('auth');

  const locale = useLocale();
  const panelMotion = useMotionPreset('fadeUp');

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<AuthErrorCode | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const sendRecoveryEmail = useCallback(
    async (email: string): Promise<void> => {
      setFailure(null);

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Through the callback, which turns the one-time code into a session,
        // and on to the page where a new password is chosen.
        redirectTo: `${window.location.origin}/${locale}/auth/callback?next=/reset-password`,
      });

      // Anything other than being asked to slow down is deliberately not
      // reported: whether an account exists is not ours to disclose.
      if (error) {
        const code = toAuthErrorCode(error);
        if (code === 'tooManyAttempts' || code === 'network') {
          setFailure(code);
          return;
        }
      }

      setSentTo(email);
      setSecondsLeft(RESEND_SECONDS);
    },
    [locale],
  );

  async function onSubmit(values: ForgotPasswordInput): Promise<void> {
    await sendRecoveryEmail(values.email);
  }

  async function onResend(): Promise<void> {
    if (secondsLeft > 0) return;
    await sendRecoveryEmail(getValues('email'));
  }

  // --- after sending -------------------------------------------------------
  if (sentTo) {
    return (
      <motion.div {...panelMotion} className="space-y-6">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-surface text-success">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>

        <div>
          <h1 className="text-h2 text-fg">{t('forgot.sentTitle')}</h1>
          {/* Carefully worded: "if an account exists". The screen looks the
              same for an address we have never seen. */}
          <p className="mt-2 text-body-small text-fg-subtle">
            {t.rich('forgot.sentBody', {
              email: sentTo,
              strong: (chunks) => <span className="font-medium text-fg">{chunks}</span>,
            })}
          </p>
        </div>

        <InfoCard tone="neutral">{t('forgot.checkSpam')}</InfoCard>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={onResend} disabled={secondsLeft > 0}>
            {secondsLeft > 0 ? t('forgot.resendIn', { seconds: secondsLeft }) : t('forgot.resend')}
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded text-body-small text-primary-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t('forgot.backToLogin')}
          </Link>
        </div>
      </motion.div>
    );
  }

  // --- the form ------------------------------------------------------------
  return (
    <Stagger className="space-y-6">
      <StaggerItem>
        <h1 className="text-h2 text-fg">{t('forgot.title')}</h1>
        <p className="mt-2 text-body-small text-fg-subtle">{t('forgot.subtitle')}</p>
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
          <FormField error={errors.email?.message}>
            <FormLabel>{t('login.email')}</FormLabel>
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              placeholder={t('login.emailPlaceholder')}
              dir="ltr"
              {...register('email')}
            />
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
            iconStart={<Send />}
          >
            {t('forgot.submit')}
          </Button>
        </StaggerItem>
      </form>

      <StaggerItem>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded text-body-small text-primary-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t('forgot.backToLogin')}
        </Link>
      </StaggerItem>
    </Stagger>
  );
}
