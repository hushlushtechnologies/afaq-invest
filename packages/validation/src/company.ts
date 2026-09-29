import { z } from 'zod';
import { COMPANY_TYPES } from '@afaq/types';

/**
 * Creating and editing a company.
 *
 * Mirrors what the API accepts, so the form catches the same mistakes before a
 * request is made — and the API still checks, because a form is not a security
 * boundary.
 *
 * Optional text fields are empty strings in the form and null on the wire. The
 * form keeps strings because a controlled input cannot hold null without React
 * complaining; the drawer converts on submit.
 */

/** Trimmed, and empty means "not given" rather than an empty value. */
const optionalText = (max: number, tooLong: string) =>
  z.string().trim().max(max, { error: tooLong }).optional();

export const companyNameSchema = z
  .string()
  .trim()
  .min(2, { error: 'Enter the company name' })
  .max(160, { error: 'That name is too long' })
  // The API turns the name into a web address, and refuses a name with
  // nothing to build one from. Catching it here says so next to the field
  // rather than after a round trip.
  .refine((name) => /[\p{L}\p{N}]{2}/u.test(name.normalize('NFKC')), {
    error: 'The name needs at least two letters or numbers',
  });

const sharedFields = {
  name: companyNameSchema,
  legalName: optionalText(200, 'That legal name is too long'),
  sector: z
    .string()
    .trim()
    .min(2, { error: 'Enter a sector' })
    .max(80, { error: 'That sector is too long' }),
  description: optionalText(4000, 'That description is too long'),
  website: z
    .union([
      z.literal(''),
      z.string().trim().url({ error: 'Enter a full address, including https://' }),
    ])
    .optional(),
  contactEmail: z
    .union([
      z.literal(''),
      z.string().trim().toLowerCase().email({ error: 'Enter a valid email address' }),
    ])
    .optional(),
  contactPhone: optionalText(40, 'That phone number is too long'),
};

/** Creating. Type is fixed at creation; everything else can be edited later. */
export const createCompanySchema = z.object({
  ...sharedFields,
  type: z.enum(COMPANY_TYPES, { error: 'Choose whether this is an Afaq company or a partner' }),
  isFeatured: z.boolean().optional(),
  /**
   * Kept as text, not coerced.
   *
   * z.coerce.number() would make the schema's input type `unknown` while its
   * output stays `number`, and react-hook-form's resolver needs those to
   * agree. A number input also hands back NaN the moment the field is
   * cleared, which is not a validation message anybody wants to read. The
   * drawer parses it on submit instead.
   */
  displayOrder: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^\d{1,6}$/, { error: 'Enter a whole number, 0 or more' }),
    ])
    .optional(),
});

/**
 * Editing.
 *
 * No type, status, verification, featured or order. Each of those is a
 * decision with its own endpoint, its own permission and its own audit entry —
 * letting them ride along inside an ordinary edit would mean anybody who can
 * fix a typo can also change whether the company trades.
 */
export const updateCompanySchema = z.object(sharedFields);

export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;
export type UpdateCompanyFormValues = z.infer<typeof updateCompanySchema>;
