import type { AuthRefusalReason, StaffContextDto } from '@afaq/types';

/**
 * Who the request belongs to, as far as this application is concerned.
 *
 * Supabase says which account is authenticated; this says which staff member
 * that is, whether they are allowed in, and what they may do. Controllers
 * receive it through @CurrentStaff().
 *
 * The shape is shared with the Admin Portal through @afaq/types, so the two
 * sides cannot disagree about what /auth/me returns.
 */
export type StaffContext = StaffContextDto;

export type { AuthRefusalReason };
