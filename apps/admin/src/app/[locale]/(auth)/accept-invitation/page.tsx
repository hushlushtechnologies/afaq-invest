import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Button, InfoCard } from '@afaq/ui';
import { AcceptInvitationForm } from '@/components/auth/accept-invitation-form';
import { Link } from '@/i18n/navigation';
import { getAuthUser } from '@/lib/auth/server';

/**
 * Where an invitation link lands, after the callback route has exchanged it
 * for a session.
 *
 * Without a session the link was already used, or has expired, or somebody
 * typed the address — all of which look the same from here and have the same
 * answer: ask for a new invitation.
 */
export default async function AcceptInvitationPage(): Promise<ReactNode> {
  const t = await getTranslations('auth.acceptInvitation');
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-heading-4 text-fg">{t('deadLinkTitle')}</h1>
          <p className="text-body-small text-fg-muted">{t('deadLinkBody')}</p>
        </div>

        <InfoCard tone="neutral">{t('deadLinkHelp')}</InfoCard>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">{t('backToSignIn')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <AcceptInvitationForm
      email={user.email ?? ''}
      // Set from the invitation, so it is their real name rather than
      // something they typed in a hurry.
      fullName={(user.user_metadata?.full_name as string | undefined) ?? ''}
    />
  );
}
