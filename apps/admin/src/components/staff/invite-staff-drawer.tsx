'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiRequestError } from '@afaq/api-client';
import { MailPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { LOCALES, LOCALE_CODES, SYSTEM_ROLES } from '@afaq/types';

import {
  Button,
  Checkbox,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  Select,
  SuccessState,
} from '@afaq/ui';
import { inviteStaffSchema, type InviteStaffFormValues } from '@afaq/validation';
import { usePermissions } from '@/lib/auth/use-permissions';
import { useRoles } from '@/lib/roles/use-roles';
import { useInviteStaff } from '@/lib/staff/use-invite-staff';

/**
 * Inviting a staff member.
 *
 * A drawer rather than a page: the person doing this is usually looking at
 * the staff list and wants to stay there.
 *
 * The roles offered are only those the inviter could grant themselves. The
 * API enforces the same rule — this just avoids offering something that will
 * be refused.
 */
export function InviteStaffDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('staff.invite');
  const { canAll, isSuperAdmin } = usePermissions();
  const invite = useInviteStaff();
  const [invited, setInvited] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteStaffFormValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: '', fullName: '', jobTitle: '', roleKeys: [], preferredLocale: 'en' },
  });

  // From the API, so custom roles can be handed out too.
  const { data: roles } = useRoles();

  const grantableRoles = (roles ?? []).filter(
    (role) => isSuperAdmin || (!role.isSuperAdmin && canAll(role.permissionKeys)),
  );

  async function onSubmit(values: InviteStaffFormValues): Promise<void> {
    await invite.mutateAsync({
      email: values.email,
      fullName: values.fullName,
      jobTitle: values.jobTitle || undefined,
      roleKeys: values.roleKeys,
      preferredLocale: values.preferredLocale,
    });

    setInvited(values.email);
  }

  function close(): void {
    reset();
    invite.reset();
    setInvited(null);
    onClose();
  }

  // The API's own words where it has them: "already invited" and "cannot
  // grant that role" are far more use than "something went wrong".
  const failure =
    invite.error instanceof ApiRequestError
      ? invite.error.message
      : invite.error
        ? t('failed')
        : null;

  return (
    <Drawer
      open={open}
      onClose={close}
      side="end"
      size="md"
      title={invited ? t('sentTitle') : t('title')}
      description={invited ? undefined : t('description')}
      footer={
        invited ? (
          <Button variant="outline" onClick={close} className="w-full">
            {t('done')}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              form="invite-staff-form"
              variant="gradient"
              iconStart={<MailPlus />}
              loading={isSubmitting}
            >
              {t('submit')}
            </Button>
          </>
        )
      }
    >
      {invited ? (
        <SuccessState
          size="sm"
          title={t('sentTitle')}
          description={t('sentBody', { email: invited })}
        />
      ) : (
        <form
          id="invite-staff-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          {failure ? (
            <InfoCard tone="danger" announce>
              {failure}
            </InfoCard>
          ) : null}

          <FormField required error={errors.fullName?.message}>
            <FormLabel>{t('fullName')}</FormLabel>
            <Input autoFocus placeholder={t('fullNamePlaceholder')} {...register('fullName')} />
            <FormMessage />
          </FormField>

          <FormField required error={errors.email?.message}>
            <FormLabel>{t('email')}</FormLabel>
            <Input
              type="email"
              inputMode="email"
              dir="ltr"
              placeholder="name@afaq.ae"
              {...register('email')}
            />
            <FormDescription>{t('emailHelp')}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField error={errors.jobTitle?.message}>
            <FormLabel>{t('jobTitle')}</FormLabel>
            <Input placeholder={t('jobTitlePlaceholder')} {...register('jobTitle')} />
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

          <FormField required error={errors.roleKeys?.message}>
            <FormLabel>{t('roles')}</FormLabel>
            <FormDescription>{t('rolesHelp')}</FormDescription>

            <Controller
              control={control}
              name="roleKeys"
              render={({ field }) => (
                <div className="mt-2 space-y-2">
                  {grantableRoles.map((role) => (
                    <Checkbox
                      key={role.key}
                      label={role.name}
                      description={role.description ?? undefined}
                      checked={field.value.includes(role.key)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, role.key]
                            : field.value.filter((key) => key !== role.key),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            />
            <FormMessage />
          </FormField>
        </form>
      )}
    </Drawer>
  );
}
