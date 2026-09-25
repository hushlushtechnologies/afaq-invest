'use client';

import { useAuth } from './auth-context';
import { usePermissions } from './use-permissions';

/**
 * The signed-in staff member, as the interface needs them.
 *
 * Identity comes from Supabase; the name and role come from our own staff
 * record once it has loaded. Until then the email stands in, so the topbar is
 * never empty.
 */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** The staff member's primary role, or empty while it loads. */
  roleLabel: string;
  avatarUrl?: string;
}

/** Falls back to the part of the email before the @ when no name is known. */
function nameFrom(email: string, candidate: unknown): string {
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  return email.split('@')[0] ?? email;
}

/** "FINANCE_OFFICER" → "Finance Officer" */
function roleLabelFrom(roleKeys: readonly string[]): string {
  const first = roleKeys[0];
  if (!first) return '';

  return first
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function useCurrentUser(): CurrentUser | null {
  const { user } = useAuth();
  const { staff } = usePermissions();

  if (!user) return null;

  const email = staff?.email ?? user.email ?? '';
  const metadata = user.user_metadata as Record<string, unknown> | undefined;

  return {
    id: user.id,
    name: staff?.fullName ?? nameFrom(email, metadata?.full_name),
    email,
    roleLabel: staff ? roleLabelFrom(staff.roleKeys) : '',
    avatarUrl: typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : undefined,
  };
}
