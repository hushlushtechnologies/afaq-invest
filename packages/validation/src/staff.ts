import { z } from 'zod';
import { emailSchema } from './common';

/**
 * Inviting a staff member.
 *
 * Mirrors what the API accepts, so the form catches the same mistakes before
 * a request is made — and the API still checks, because a form is not a
 * security boundary.
 */
export const inviteStaffSchema = z.object({
  email: emailSchema,
  fullName: z
    .string()
    .trim()
    .min(2, { error: 'Enter their full name' })
    .max(120, { error: 'That name is too long' }),
  jobTitle: z.string().trim().max(120, { error: 'That job title is too long' }).optional(),
  roleKeys: z.array(z.string()).min(1, { error: 'Choose at least one role' }),
  preferredLocale: z.enum(['en', 'ar']).optional(),
});

export type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>;
