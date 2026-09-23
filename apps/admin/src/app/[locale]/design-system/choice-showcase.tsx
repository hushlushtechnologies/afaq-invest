'use client';

import { useState, type ReactNode } from 'react';
import {
  Checkbox,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  Radio,
  RadioGroup,
  Select,
  Switch,
  type SelectOption,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const COMPANY_TYPES: SelectOption[] = [
  { value: 'internal', label: 'Internal company' },
  { value: 'third-party', label: 'Third-party company' },
  { value: 'pending', label: 'Pending approval', disabled: true },
];

const INVESTORS = ['Investor 1', 'Investor 2', 'Investor 3'] as const;

function Panel({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-xl border border-border bg-surface card-padding md:grid-cols-2">
      {children}
    </div>
  );
}

export function ChoiceShowcase(): ReactNode {
  const [selected, setSelected] = useState<boolean[]>([true, false, false]);

  const checkedCount = selected.filter(Boolean).length;
  const allChecked = checkedCount === selected.length;
  const someChecked = checkedCount > 0 && !allChecked;

  function toggleAll(): void {
    setSelected(selected.map(() => !allChecked));
  }

  function toggleOne(index: number): void {
    setSelected(selected.map((value, position) => (position === index ? !value : value)));
  }

  return (
    <>
      <ShowcaseSection title="Select">
        <Panel>
          <FormField>
            <FormLabel>Company type</FormLabel>
            <Select options={COMPANY_TYPES} placeholder="Select a type" />
          </FormField>

          <FormField error="Select a sector">
            <FormLabel>Sector</FormLabel>
            <Select options={COMPANY_TYPES} placeholder="Select a sector" />
            <FormMessage />
          </FormField>

          <FormField disabled>
            <FormLabel>Disabled</FormLabel>
            <Select options={COMPANY_TYPES} placeholder="Unavailable" />
          </FormField>

          <FormField>
            <FormLabel>Small</FormLabel>
            <Select fieldSize="sm" options={COMPANY_TYPES} defaultValue="internal" />
          </FormField>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Checkbox">
        <Panel>
          <div className="space-y-3">
            <Checkbox label="Default" />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="With description" description="Extra context under the label" />
            <Checkbox label="Disabled" disabled />
            <Checkbox label="Error" error />
          </div>

          <div>
            <p className="mb-3 font-mono text-caption text-fg-muted">select all — indeterminate</p>
            <Checkbox
              data-testid="select-all"
              label="Select all investors"
              checked={allChecked}
              indeterminate={someChecked}
              onChange={toggleAll}
            />
            <div className="ms-2 mt-3 space-y-2 border-s border-border-subtle ps-5">
              {INVESTORS.map((name, index) => (
                <Checkbox
                  key={name}
                  label={name}
                  checked={selected[index] ?? false}
                  onChange={() => toggleOne(index)}
                />
              ))}
            </div>
          </div>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Radio">
        <Panel>
          <FormField>
            <FormLabel>Investment type</FormLabel>
            <RadioGroup>
              <Radio name="demo-type" value="locked" label="Locked" defaultChecked />
              <Radio
                name="demo-type"
                value="unlocked"
                label="Unlocked"
                description="Withdraw after the notice period"
              />
              <Radio name="demo-type" value="hybrid" label="Hybrid (disabled)" disabled />
            </RadioGroup>
          </FormField>

          <FormField>
            <FormLabel>Term</FormLabel>
            <RadioGroup orientation="horizontal">
              <Radio name="demo-term" value="6" label="6 months" />
              <Radio name="demo-term" value="12" label="12 months" defaultChecked />
              <Radio name="demo-term" value="24" label="24 months" />
            </RadioGroup>
            <FormDescription>Arrow keys move between options.</FormDescription>
          </FormField>
        </Panel>
      </ShowcaseSection>

      <ShowcaseSection title="Switch">
        <div className="space-y-4 rounded-xl border border-border bg-surface card-padding">
          <Switch label="Default" />
          <Switch data-testid="switch-on" label="On" defaultChecked />
          <Switch
            label="Email notifications"
            description="Receive updates about investment activity"
            defaultChecked
          />
          <Switch label="Small" switchSize="sm" defaultChecked />
          <Switch label="Disabled" disabled />
          <div className="border-t border-border-subtle pt-4">
            <Switch
              label="Label first — the settings-row layout"
              description="The switch sits at the far end"
              labelPosition="start"
              defaultChecked
            />
          </div>
        </div>
      </ShowcaseSection>
    </>
  );
}
