'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
  Checkbox,
  CurrencyInput,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  Input,
  Radio,
  RadioGroup,
  Select,
  Switch,
  type SelectOption,
} from '@afaq/ui';
import {
  demoInvestorSchema,
  type DemoInvestorInput,
  type DemoInvestorValues,
} from '@afaq/validation';
import { ShowcaseSection } from './showcase-section';

const SECTOR_OPTIONS: SelectOption[] = [
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'technology', label: 'Technology' },
];

export function FormIntegration(): ReactNode {
  const [submitted, setSubmitted] = useState<DemoInvestorValues | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DemoInvestorInput, unknown, DemoInvestorValues>({
    resolver: zodResolver(demoInvestorSchema),
    defaultValues: { fullName: '', email: '', notifications: true },
  });

  async function onSubmit(values: DemoInvestorValues): Promise<void> {
    // Stands in for an API call.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitted(values);
  }

  return (
    <ShowcaseSection title="React Hook Form + Zod">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-xl border border-border bg-surface card-padding"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField required error={errors.fullName?.message}>
            <FormLabel>Full name</FormLabel>
            <Input {...register('fullName')} placeholder="Ahmed Al Mansouri" />
            <FormMessage />
          </FormField>

          <FormField required error={errors.email?.message}>
            <FormLabel>Email</FormLabel>
            <Input {...register('email')} type="email" placeholder="ahmed@afaq.ae" />
            <FormMessage />
          </FormField>

          <FormField required error={errors.sector?.message}>
            <FormLabel>Sector</FormLabel>
            <Select
              {...register('sector')}
              options={SECTOR_OPTIONS}
              placeholder="Select a sector"
            />
            <FormMessage />
          </FormField>

          <FormField required error={errors.amount?.message}>
            <FormLabel>Investment amount</FormLabel>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FormDescription>Between AED 50,000 and AED 10,000,000.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField required error={errors.riskProfile?.message}>
            <FormLabel>Risk profile</FormLabel>
            <RadioGroup>
              <Radio
                {...register('riskProfile')}
                value="conservative"
                label="Conservative"
                description="Lower return, lower volatility"
              />
              <Radio {...register('riskProfile')} value="balanced" label="Balanced" />
              <Radio
                {...register('riskProfile')}
                value="growth"
                label="Growth"
                description="Higher return, higher volatility"
              />
            </RadioGroup>
            <FormMessage />
          </FormField>

          <div className="flex flex-col gap-5">
            <Switch
              {...register('notifications')}
              label="Email notifications"
              description="Updates about this investment"
            />
            <FormField error={errors.acceptTerms?.message}>
              <Checkbox {...register('acceptTerms')} label="I accept the terms and conditions" />
              <FormMessage />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-border-subtle pt-5">
          <Button type="submit" variant="gradient" loading={isSubmitting}>
            Submit
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setSubmitted(null);
            }}
          >
            Reset
          </Button>
        </div>

        {submitted ? (
          <pre
            data-testid="submitted"
            className="mt-5 overflow-x-auto rounded-lg border border-border bg-background-subtle p-4 text-caption text-fg-secondary"
          >
            {JSON.stringify(submitted, null, 2)}
          </pre>
        ) : null}
      </form>
      <p className="mt-3 text-caption text-fg-muted">
        Submit with everything empty: every field shows its own error. noValidate switches off the
        built-in browser messages, so Zod controls all validation with the same schema the API will
        use.
      </p>
    </ShowcaseSection>
  );
}
