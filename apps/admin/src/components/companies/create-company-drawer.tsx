'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiRequestError } from '@afaq/api-client';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { COMPANY_TYPES, type CompanyInput } from '@afaq/types';
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
  SuccessState,
  Switch,
  Textarea,
} from '@afaq/ui';
import { createCompanySchema, type CreateCompanyFormValues } from '@afaq/validation';
import { useCreateCompany } from '@/lib/companies/use-company-mutations';
import { useCompanySectors } from '@/lib/companies/use-companies';

/** Empty string means "not given"; the API wants null. */
const orNull = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/**
 * Adding a company.
 *
 * A drawer rather than a page: whoever is doing this is looking at the company
 * list and wants to stay there.
 *
 * Ownership is chosen once, here, and cannot be edited afterwards. Moving a
 * company between Afaq's own and a partner would change what verification
 * means for it, and quietly leave it either exempt or unvetted.
 */
export function CreateCompanyDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('companies.create');
  const tType = useTranslations('companies.type');
  const create = useCreateCompany();
  const { data: sectors } = useCompanySectors();
  const [created, setCreated] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      legalName: '',
      type: 'THIRD_PARTY',
      sector: '',
      description: '',
      website: '',
      contactEmail: '',
      contactPhone: '',
      isFeatured: false,
      displayOrder: '0',
    },
  });

  async function onSubmit(values: CreateCompanyFormValues): Promise<void> {
    const body: CompanyInput = {
      name: values.name.trim(),
      legalName: orNull(values.legalName),
      type: values.type,
      sector: values.sector.trim(),
      description: orNull(values.description),
      website: orNull(values.website),
      contactEmail: orNull(values.contactEmail),
      contactPhone: orNull(values.contactPhone),
      isFeatured: values.isFeatured ?? false,
      // Text in the form, a number on the wire. Blank means the default.
      displayOrder: values.displayOrder ? Number(values.displayOrder) : 0,
    };

    await create.mutateAsync(body);
    setCreated(body.name);
  }

  function close(): void {
    reset();
    create.reset();
    setCreated(null);
    onClose();
  }

  // The API's own words where it has them. "Another company already uses the
  // web address afaq-al-manzil-properties" tells somebody exactly what to
  // change; "something went wrong" does not.
  const failure =
    create.error instanceof ApiRequestError
      ? create.error.message
      : create.error
        ? t('failed')
        : null;

  return (
    <Drawer
      open={open}
      onClose={close}
      side="end"
      size="md"
      title={created ? t('doneTitle') : t('title')}
      description={created ? undefined : t('description')}
      footer={
        created ? (
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
              form="create-company-form"
              variant="gradient"
              iconStart={<Building2 />}
              loading={isSubmitting}
            >
              {t('submit')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <SuccessState
          size="sm"
          title={t('doneTitle')}
          description={t('doneBody', { name: created })}
        />
      ) : (
        <form
          id="create-company-form"
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
            <Input autoFocus placeholder={t('namePlaceholder')} {...register('name')} />
            <FormDescription>{t('nameHelp')}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField error={errors.legalName?.message}>
            <FormLabel>{t('legalName')}</FormLabel>
            <Input placeholder={t('legalNamePlaceholder')} {...register('legalName')} />
            <FormDescription>{t('legalNameHelp')}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField required error={errors.type?.message}>
            <FormLabel>{t('type')}</FormLabel>
            <Select
              {...register('type')}
              options={COMPANY_TYPES.map((value) => ({ value, label: tType(value) }))}
            />
            <FormDescription>{t('typeHelp')}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField required error={errors.sector?.message}>
            <FormLabel>{t('sector')}</FormLabel>
            {/* A free-text box with suggestions rather than a fixed list: an
                administrator can invent a sector, and the ones already in use
                are offered so they do not end up with two spellings of one. */}
            <Input
              list="company-sectors"
              placeholder={t('sectorPlaceholder')}
              {...register('sector')}
            />
            <datalist id="company-sectors">
              {(sectors ?? []).map((sector) => (
                <option key={sector} value={sector} />
              ))}
            </datalist>
            <FormMessage />
          </FormField>

          <FormField error={errors.description?.message}>
            <FormLabel>{t('descriptionLabel')}</FormLabel>
            <Textarea
              rows={5}
              maxLength={4000}
              showCount
              placeholder={t('descriptionPlaceholder')}
              {...register('description')}
            />
            <FormMessage />
          </FormField>

          <FormField error={errors.website?.message}>
            <FormLabel>{t('website')}</FormLabel>
            <Input
              type="url"
              dir="ltr"
              placeholder="https://example.com"
              {...register('website')}
            />
            <FormMessage />
          </FormField>

          <FormField error={errors.contactEmail?.message}>
            <FormLabel>{t('contactEmail')}</FormLabel>
            <Input
              type="email"
              inputMode="email"
              dir="ltr"
              placeholder="invest@example.com"
              {...register('contactEmail')}
            />
            <FormMessage />
          </FormField>

          <FormField error={errors.contactPhone?.message}>
            <FormLabel>{t('contactPhone')}</FormLabel>
            <Input
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="+971 4 000 0000"
              {...register('contactPhone')}
            />
            <FormMessage />
          </FormField>

          <FormField error={errors.displayOrder?.message}>
            <FormLabel>{t('displayOrder')}</FormLabel>
            <Input inputMode="numeric" dir="ltr" placeholder="0" {...register('displayOrder')} />
            <FormDescription>{t('displayOrderHelp')}</FormDescription>
            <FormMessage />
          </FormField>

          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <Switch
                label={t('featured')}
                description={t('featuredHelp')}
                labelPosition="start"
                checked={field.value ?? false}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            )}
          />

          <InfoCard tone="info">{t('logoNote')}</InfoCard>
        </form>
      )}
    </Drawer>
  );
}
