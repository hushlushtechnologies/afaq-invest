import { z } from 'zod';
import { emailSchema } from './common';

/**
 * Authentication forms.
 *
 * Signing in checks only that something was typed: telling someone their
 * password is "too short" at the sign-in box would confirm the rules to
 * anyone guessing. Strength is enforced where a password is chosen.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Twelve characters, mixed case and a digit — checked where it is chosen. */
export const passwordSchema = z
  .string()
  .min(12, { error: 'Use at least 12 characters' })
  .regex(/[a-z]/, { error: 'Include a lowercase letter' })
  .regex(/[A-Z]/, { error: 'Include an uppercase letter' })
  .regex(/[0-9]/, { error: 'Include a number' });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: 'The two passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** How strong a chosen password is, for the meter shown while typing. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}
