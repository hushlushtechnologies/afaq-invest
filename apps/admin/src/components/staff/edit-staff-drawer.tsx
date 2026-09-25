'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiRequestError } from '@afaq/api-client';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { LOCALES, LOCALE_CODES, type StaffListItem } from '@afaq/types';
import {
  Button,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  Select,
} from '@afaq/ui';
import { z } from 'zod';
import { useUpdateStaffDetails } from '@/lib/staff/use-staff-mutations';

const editStaffSchema = z.object({
  fullName: z.string().trim().min(2, { error: 'Enter their full name' }).max(120),
  jobTitle: z.string().trim().max(120).optional(),
  preferredLocale: z.enum(['en', 'ar']),
});

type EditStaffValues = z.infer<typeof editStaffSchema>;

/**
 * Editing a staff member's details.
 *
 * Their email is shown but not editable: it is their identity in Supabase as
 * well as here, and changing it would quietly break their sign-in.
 */
export function EditStaffDrawer({
  staff,
  onClose,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('staff.edit');
  const update = useUpdateStaffDetails();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditStaffValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: { fullName: '', jobTitle: '', preferredLocale: 'en' },
  });

  const [failure, setFailure] = useState<string | null>(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Clear last time's error when a different person is opened.
  if (staff && staff.id !== openedFor) {
    setOpenedFor(staff.id);
    setFailure(null);
  }

  // Fill the form. This one has to be an effect: it is react-hook-form's
  // store being written, not React state.
  useEffect(() => {
    if (!staff) return;
    reset({
      fullName: staff.fullName,
      jobTitle: staff.jobTitle ?? '',
      preferredLocale: staff.preferredLocale,
    });
  }, [staff, reset]);

  async function onSubmit(values: EditStaffValues): Promise<void> {
    if (!staff) return;
    setFailure(null);

    try {
      await update.mutateAsync({
        id: staff.id,
        fullName: values.fullName,
        jobTitle: values.jobTitle ?? '',
        preferredLocale: values.preferredLocale,
      });
      onClose();
    } catch (error) {
      // Stay open with what they typed so they can fix it and retry.
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
    }
  }

  return (
    <Drawer
      open={staff !== null}
      onClose={onClose}
      side="end"
      size="md"
      title={t('title')}
      description={staff?.email}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-staff-form"
            variant="primary"
            iconStart={<Save />}
            loading={isSubmitting}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <form id="edit-staff-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        <FormField required error={errors.fullName?.message}>
          <FormLabel>{t('fullName')}</FormLabel>
          <Input autoFocus {...register('fullName')} />
          <FormMessage />
        </FormField>

        <FormField error={errors.jobTitle?.message}>
          <FormLabel>{t('jobTitle')}</FormLabel>
          <Input {...register('jobTitle')} />
          <FormMessage />
        </FormField>

        <FormField error={errors.preferredLocale?.message}>
          <FormLabel>{t('language')}</FormLabel>
          <Select
            {...register('preferredLocale')}
            options={LOCALE_CODES.map((code) => ({
              value: code,
              label: LOCALES[code].nativeLabel,
            }))}
          />
          <FormDescription>{t('languageHelp')}</FormDescription>
          <FormMessage />
        </FormField>

        <InfoCard tone="neutral">{t('emailFixed')}</InfoCard>
      </form>
    </Drawer>
  );
}
