'use client';

import { Building2, Mail } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  CurrencyInput,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  SearchInput,
  Textarea,
} from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { ShowcaseSection } from './showcase-section';

function Grid({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-surface card-padding md:grid-cols-2">
      {children}
    </div>
  );
}

export function FormShowcase(): ReactNode {
  const [search, setSearch] = useState('Emerald Tower');
  const [amount, setAmount] = useState<number | null>(1250000);

  return (
    <>
      <ShowcaseSection title="Text inputs — states">
        <Grid>
          <FormField>
            <FormLabel>Default</FormLabel>
            <Input placeholder="Enter a value" />
          </FormField>

          <FormField required>
            <FormLabel>Full name</FormLabel>
            <Input placeholder="Ahmed Al Mansouri" />
          </FormField>

          <FormField error="Enter a valid email address">
            <FormLabel>Email</FormLabel>
            <Input data-testid="email-error" iconStart={<Mail />} defaultValue="not-an-email" />
            <FormMessage />
          </FormField>

          <FormField success>
            <FormLabel>Verified email</FormLabel>
            <Input iconStart={<Mail />} defaultValue="ahmed@afaq.ae" />
            <FormMessage variant="success">Email verified</FormMessage>
          </FormField>

          <FormField disabled>
            <FormLabel>Disabled</FormLabel>
            <Input placeholder="Not editable" />
          </FormField>

          <FormField>
            <FormLabel hint="Read only">Reference</FormLabel>
            <Input readOnly defaultValue="AFQ-2026-0041" />
          </FormField>

          <FormField>
            <FormLabel>Loading</FormLabel>
            <Input placeholder="Checking availability" loading />
          </FormField>

          <FormField>
            <FormLabel>With description</FormLabel>
            <Input
              data-testid="with-description"
              iconStart={<Building2 />}
              placeholder="Company name"
            />
            <FormDescription>The registered trade name, exactly as on the licence.</FormDescription>
          </FormField>
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Text inputs — sizes">
        <Grid>
          <FormField>
            <FormLabel>Small</FormLabel>
            <Input fieldSize="sm" placeholder="sm" />
          </FormField>
          <FormField>
            <FormLabel>Medium</FormLabel>
            <Input fieldSize="md" placeholder="md" />
          </FormField>
          <FormField>
            <FormLabel>Large</FormLabel>
            <Input fieldSize="lg" placeholder="lg" />
          </FormField>
          <FormField>
            <FormLabel>With suffix</FormLabel>
            <Input placeholder="12" suffix="months" inputMode="numeric" />
          </FormField>
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Specialised inputs">
        <Grid>
          <FormField required>
            <FormLabel>Password</FormLabel>
            <PasswordInput placeholder="Enter your password" />
            <FormDescription>At least 12 characters.</FormDescription>
          </FormField>

          <FormField>
            <FormLabel>Search</FormLabel>
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search opportunities"
            />
          </FormField>

          <FormField>
            <FormLabel>Investment amount</FormLabel>
            <CurrencyInput data-testid="currency" value={amount} onValueChange={setAmount} />
            <FormDescription>
              Stored as a number:{' '}
              <span className="text-numeric text-fg" data-testid="currency-value">
                {amount === null ? 'empty' : String(amount)}
              </span>
              {amount !== null ? ` (${formatCurrency(amount)})` : ''}
            </FormDescription>
          </FormField>

          <FormField>
            <FormLabel>Currency at the end</FormLabel>
            <CurrencyInput value={null} currencyPosition="end" placeholder="0.00" />
          </FormField>
        </Grid>
      </ShowcaseSection>

      <ShowcaseSection title="Textarea">
        <Grid>
          <FormField>
            <FormLabel hint="Optional">Notes</FormLabel>
            <Textarea placeholder="Add any context" maxLength={200} showCount />
            <FormDescription>Visible to internal staff only.</FormDescription>
          </FormField>

          <FormField error="Give a reason for the rejection">
            <FormLabel>Rejection reason</FormLabel>
            <Textarea rows={3} />
            <FormMessage />
          </FormField>
        </Grid>
      </ShowcaseSection>

      <p className="text-caption text-fg-muted">
        Click a label: focus moves into its field. Focus the amount field: the grouping disappears
        while you type and returns when you leave.
      </p>
    </>
  );
}
