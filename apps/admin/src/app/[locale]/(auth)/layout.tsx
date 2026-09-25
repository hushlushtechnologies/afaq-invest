import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Reveal } from '@afaq/ui';
import { AuthBackdrop } from '@/components/auth/auth-backdrop';
import { AuthControls } from '@/components/auth/auth-controls';
import { Logo } from '@/components/brand/logo';

/**
 * The layout for signing in, recovering a password and accepting an
 * invitation. No sidebar and no topbar: nobody is signed in yet.
 *
 * Two columns on a wide screen — the brand on the reading-start side, the form
 * on the other. One column on a phone, with a compact brand header, so the
 * form is reachable without scrolling.
 */
export default async function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  const t = await getTranslations('auth');

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* --- brand -------------------------------------------------------- */}
      <section className="relative isolate flex shrink-0 flex-col justify-between overflow-hidden bg-sidebar-background px-6 py-6 lg:w-[46%] lg:max-w-2xl lg:px-12 lg:py-12">
        <AuthBackdrop />

        <div className="relative">
          <Logo />
        </div>

        {/* The headline is desktop-only: on a phone it would push the form
            below the fold, and the form is what people came for. */}
        <div className="relative hidden lg:block">
          <Reveal preset="fadeUp">
            <p className="max-w-md text-display text-sidebar-text">{t('brand.headline')}</p>
          </Reveal>
          <Reveal preset="fadeUp" delay={0.08}>
            <p className="mt-4 max-w-md text-body text-sidebar-text-muted">
              {t('brand.description')}
            </p>
          </Reveal>
        </div>

        <div className="relative hidden items-center gap-2 text-caption text-sidebar-text-muted lg:flex">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t('brand.security')}
        </div>
      </section>

      {/* --- form --------------------------------------------------------- */}
      <section className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute inset-e-4 top-4 flex items-center gap-2">
          <AuthControls />
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </section>
    </div>
  );
}
