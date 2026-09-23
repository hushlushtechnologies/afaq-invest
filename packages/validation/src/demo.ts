import { z } from 'zod';
import { emailSchema } from './common';

/**
 * DEMO SCHEMA — used by the design-system page to prove the form system
 * works end to end. Real investor schemas arrive with the Investors module.
 */
export const DEMO_SECTORS = ['real-estate', 'hospitality', 'automotive', 'technology'] as const;

export const DEMO_RISK_PROFILES = ['conservative', 'balanced', 'growth'] as const;

export const demoInvestorSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: 'Enter at least 3 characters' })
    .max(80, { error: 'Name is too long' }),
  email: emailSchema,
  sector: z.enum(DEMO_SECTORS, { error: 'Select a sector' }),
  amount: z
    .number({ error: 'Enter an amount' })
    .min(50_000, { error: 'Minimum investment is AED 50,000' })
    .max(10_000_000, { error: 'Maximum investment is AED 10,000,000' }),
  riskProfile: z.enum(DEMO_RISK_PROFILES, { error: 'Choose a risk profile' }),
  notifications: z.boolean(),
  acceptTerms: z.literal(true, { error: 'You must accept the terms' }),
});

export type DemoInvestorInput = z.input<typeof demoInvestorSchema>;
export type DemoInvestorValues = z.output<typeof demoInvestorSchema>;
