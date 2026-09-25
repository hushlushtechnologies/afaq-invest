'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  PasswordInput,
  Stagger,
  StaggerItem,
  useMotionPreset,
} from '@afaq/ui';
import { loginSchema, type LoginInput } from '@afaq/validation';
import { Link, useRouter } from '@/i18n/navigation';
import { toAuthErrorCode, type AuthErrorCode } from '@/lib/auth/auth-errors';
import { createClient } from '@/lib/supabase/client';

/** The handful of outcomes the callback route can hand back in the address. */
const ERRORS_FROM_LINKS: readonly AuthErrorCode[] = ['expiredLink'];

function errorFromQuery(value: string | null): AuthErrorCode | null {
  return ERRORS_FROM_LINKS.find((code) => code === value) ?? null;
}

/** Only our own paths, so a crafted link cannot bounce someone off-site. */
function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/dashboard';
  return target;
}

export function LoginForm(): ReactNode {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMotion = useMotionPreset('fadeDown');

  // An expired invitation or reset link sends people here with a reason.
  const [failure, setFailure] = useState<AuthErrorCode | null>(() =>
    errorFromQuery(searchParams.get('error')),
  );
  // Held from a successful sign-in until the new page takes over, so the
  // button never flicks back to "Sign in" mid-redirect.
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput): Promise<void> {
    setFailure(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setFailure(toAuthErrorCode(error));
      return;
    }

    setRedirecting(true);

    // refresh() rebuilds the server-rendered pages with the new session, so
    // the portal is already personalised when it appears.
    const destination = safeRedirect(searchParams.get('next'));
    router.replace(destination);
    router.refresh();
  }

  const busy = isSubmitting || redirecting;

  return (
    <Stagger className="space-y-6">
      <StaggerItem>
        <h1 className="text-h2 text-fg">{t('login.title')}</h1>
        <p className="mt-2 text-body-small text-fg-subtle">{t('login.subtitle')}</p>
      </StaggerItem>

      <AnimatePresence>
        {failure ? (
          <motion.div {...errorMotion} key={failure}>
            <InfoCard tone="danger" announce>
              {t(`errors.${failure}`)}
            </InfoCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* noValidate: the browser's own bubbles are untranslated and unstyled;
          our messages are neither. */}
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
          <FormField error={errors.password?.message}>
            <div className="flex items-baseline justify-between gap-3">
              <FormLabel>{t('login.password')}</FormLabel>
              <Link
                href="/forgot-password"
                className="rounded text-caption text-primary-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('login.forgot')}
              </Link>
            </div>
            <PasswordInput autoComplete="current-password" {...register('password')} />
            <FormMessage />
          </FormField>
        </StaggerItem>

        <StaggerItem>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            loading={busy}
            iconStart={<LogIn />}
            iconEnd={<ArrowRight className="rtl:rotate-180" />}
          >
            {t('login.submit')}
          </Button>
        </StaggerItem>
      </form>

      <StaggerItem>
        <p className="text-caption text-fg-muted">{t('login.noRegistration')}</p>
      </StaggerItem>
    </Stagger>
  );
}
