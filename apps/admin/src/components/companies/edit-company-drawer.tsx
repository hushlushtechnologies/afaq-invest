'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiRequestError } from '@afaq/api-client';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { CompanyDetail } from '@afaq/types';
import {
  Button,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  InfoCard,
  Input,
  Textarea,
} from '@afaq/ui';
import { updateCompanySchema, type UpdateCompanyFormValues } from '@afaq/validation';
import { useCompanySectors } from '@/lib/companies/use-companies';
import { useUpdateCompany, type UpdateCompanyBody } from '@/lib/companies/use-company-mutations';

/** Empty string means "not given"; the API wants null. */
const orNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/** What the form starts with, given a company. */
function valuesFor(company: CompanyDetail): UpdateCompanyFormValues {
  return {
    name: company.name,
    legalName: company.legalName ?? '',
    sector: company.sector,
    description: company.description ?? '',
    website: company.website ?? '',
    contactEmail: company.contactEmail ?? '',
    contactPhone: company.contactPhone ?? '',
  };
}

/**
 * Editing a company's details.
 *
 * Only the details. Ownership, status, verification, featuring and ordering
 * each have their own control, their own permission and their own audit entry
 * — somebody who may fix a typo should not thereby be able to take a company
 * out of the marketplace.
 *
 * Only what actually changed is sent, so the audit trail records the edit
 * rather than a restatement of every field.
 */
export function EditCompanyDrawer({
  company,
  onClose,
}: {
  company: CompanyDetail | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('companies.edit');
  const update = useUpdateCompany();
  const { data: sectors } = useCompanySectors();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateCompanyFormValues>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: '',
      legalName: '',
      sector: '',
      description: '',
      website: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  // Refilled whenever a different company is opened. Without this the drawer
  // would keep the previous company's values, which is how somebody ends up
  // saving one company's description onto another.
  useEffect(() => {
    if (company) reset(valuesFor(company));
  }, [company, reset]);

  async function onSubmit(values: UpdateCompanyFormValues): Promise<void> {
    if (!company) return;

    const next: UpdateCompanyBody = {
      name: values.name.trim(),
      legalName: orNull(values.legalName),
      sector: values.sector.trim(),
      description: orNull(values.description),
      website: orNull(values.website),
      contactEmail: orNull(values.contactEmail),
      contactPhone: orNull(values.contactPhone),
    };

    const before: UpdateCompanyBody = {
      name: company.name,
      legalName: company.legalName,
      sector: company.sector,
      description: company.description,
      website: company.website,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
    };

    // Send only what moved. The API refuses an edit that changes nothing, and
    // it is right to: an audit entry saying "changed name from X to X" is
    // noise in the one place that should be signal.
    //
    // Field by field rather than a loop over Object.keys: an indexed loop
    // widens every value to the union of all of them, and the only way to
    // assign it back is a cast that would hide a genuine mismatch.
    const changed: UpdateCompanyBody = {};
    if (next.name !== before.name) changed.name = next.name;
    if (next.legalName !== before.legalName) changed.legalName = next.legalName;
    if (next.sector !== before.sector) changed.sector = next.sector;
    if (next.description !== before.description) changed.description = next.description;
    if (next.website !== before.website) changed.website = next.website;
    if (next.contactEmail !== before.contactEmail) changed.contactEmail = next.contactEmail;
    if (next.contactPhone !== before.contactPhone) changed.contactPhone = next.contactPhone;

    if (Object.keys(changed).length === 0) {
      close();
      return;
    }

    await update.mutateAsync({ id: company.id, ...changed });
    close();
  }

  function close(): void {
    reset();
    update.reset();
    onClose();
  }

  const failure =
    update.error instanceof ApiRequestError
      ? update.error.message
      : update.error
        ? t('failed')
        : null;

  return (
    <Drawer
      open={company !== null}
      onClose={close}
      side="end"
      size="md"
      title={t('title')}
      description={company ? t('description', { name: company.name }) : undefined}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-company-form"
            variant="gradient"
            iconStart={<Save />}
            loading={isSubmitting}
            disabled={!isDirty}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      <form
        id="edit-company-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        <FormField required error={errors.name?.message}>
          <FormLabel>{t('name')}</FormLabel>
          <Input autoFocus {...register('name')} />
          {/* Said plainly, because it surprises people: the address keeps the
              old name, and that is deliberate. */}
          <FormDescription>{t('nameHelp', { slug: company?.slug ?? '' })}</FormDescription>
          <FormMessage />
        </FormField>

        <FormField error={errors.legalName?.message}>
          <FormLabel>{t('legalName')}</FormLabel>
          <Input {...register('legalName')} />
          <FormMessage />
        </FormField>

        <FormField required error={errors.sector?.message}>
          <FormLabel>{t('sector')}</FormLabel>
          <Input list="company-sectors-edit" {...register('sector')} />
          <datalist id="company-sectors-edit">
            {(sectors ?? []).map((sector) => (
              <option key={sector} value={sector} />
            ))}
          </datalist>
          <FormMessage />
        </FormField>

        <FormField error={errors.description?.message}>
          <FormLabel>{t('descriptionLabel')}</FormLabel>
          <Textarea rows={5} maxLength={4000} showCount {...register('description')} />
          <FormMessage />
        </FormField>

        <FormField error={errors.website?.message}>
          <FormLabel>{t('website')}</FormLabel>
          <Input type="url" dir="ltr" placeholder="https://example.com" {...register('website')} />
          <FormMessage />
        </FormField>

        <FormField error={errors.contactEmail?.message}>
          <FormLabel>{t('contactEmail')}</FormLabel>
          <Input type="email" inputMode="email" dir="ltr" {...register('contactEmail')} />
          <FormMessage />
        </FormField>

        <FormField error={errors.contactPhone?.message}>
          <FormLabel>{t('contactPhone')}</FormLabel>
          <Input type="tel" inputMode="tel" dir="ltr" {...register('contactPhone')} />
          <FormMessage />
        </FormField>
      </form>
    </Drawer>
  );
}
