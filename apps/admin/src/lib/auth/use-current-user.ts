'use client';

/**
 * PLACEHOLDER — the signed-in staff member.
 *
 * Sprint 3 replaces this with the real Supabase session plus the staff record
 * from our API. Everything that shows a name, an avatar or a role reads from
 * here, so only this file changes.
 */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** Shown under the name in the profile menu. */
  roleLabel: string;
  avatarUrl?: string;
}

export function useCurrentUser(): CurrentUser {
  return {
    id: 'staff-placeholder',
    name: 'Ahmed Al Mansouri',
    email: 'ahmed@afaq.ae',
    roleLabel: 'Super Admin',
  };
}
