/**
 * Turns Supabase's error messages into our own outcomes.
 *
 * Supabase writes for developers; staff need something they can act on, in
 * their own language. Each outcome maps to a key under `auth.errors`.
 *
 * Deliberately vague where it matters: a wrong password and an unknown email
 * give the same answer, so the form cannot be used to discover who has an
 * account here.
 */
export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'tooManyAttempts'
  | 'expiredLink'
  | 'weakPassword'
  | 'samePassword'
  | 'network'
  | 'unknown';

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
}

export function toAuthErrorCode(error: unknown): AuthErrorCode {
  if (!error) return 'unknown';

  const { message = '', code = '', status } = error as SupabaseLikeError;
  const text = `${code} ${message}`.toLowerCase();

  if (text.includes('invalid login credentials') || text.includes('invalid_credentials')) {
    return 'invalidCredentials';
  }
  if (text.includes('email not confirmed') || text.includes('email_not_confirmed')) {
    return 'emailNotConfirmed';
  }
  if (status === 429 || text.includes('rate limit') || text.includes('over_request_rate')) {
    return 'tooManyAttempts';
  }
  if (
    text.includes('expired') ||
    text.includes('invalid or has expired') ||
    text.includes('otp_expired')
  ) {
    return 'expiredLink';
  }
  if (text.includes('weak_password') || text.includes('password should be')) {
    return 'weakPassword';
  }
  if (text.includes('same_password') || text.includes('should be different')) {
    return 'samePassword';
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'network';
  }

  return 'unknown';
}
