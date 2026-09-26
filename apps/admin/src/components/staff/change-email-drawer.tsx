'use client';

import { ApiRequestError } from '@afaq/api-client';
import { AtSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { StaffListItem } from '@afaq/types';
import { Button, Drawer, FormDescription, FormField, FormLabel, InfoCard, Input } from '@afaq/ui';
import { useChangeStaffEmail } from '@/lib/staff/use-staff-mutations';

/**
 * Changing the address a staff member signs in with.
 *
 * It is their identity in two places at once — Supabase decides who they are,
 * our records decide what they may do — so this is a Super Admin's job and
 * says plainly what will change for the person afterwards.
 */
export function ChangeEmailDrawer({
  staff,
  onClose,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('staff.changeEmail');
  const change = useChangeStaffEmail();

  const [email, setEmail] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  if (staff && staff.id !== openedFor) {
    setOpenedFor(staff.id);
    setEmail(staff.email);
    setFailure(null);
  }

  if (!staff && openedFor !== null) setOpenedFor(null);

  async function save(): Promise<void> {
    if (!staff) return;
    setFailure(null);

    try {
      await change.mutateAsync({ id: staff.id, email: email.trim() });
      onClose();
    } catch (error) {
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
    }
  }

  const unchanged = email.trim().toLowerCase() === staff?.email.toLowerCase();

  return (
    <Drawer
      open={staff !== null}
      onClose={onClose}
      side="end"
      size="md"
      title={t('title')}
      description={staff?.fullName}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            iconStart={<AtSign />}
            loading={change.isPending}
            disabled={unchanged || email.trim().length < 5}
            onClick={save}
          >
            {t('save')}
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

        <InfoCard tone="warning">{t('warning')}</InfoCard>

        <FormField required>
          <FormLabel>{t('email')}</FormLabel>
          <Input
            type="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <FormDescription>{t('help')}</FormDescription>
        </FormField>
      </div>
    </Drawer>
  );
}
