'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { StaffTable } from './staff-table';

/**
 * The staff directory, behind its permission.
 *
 * The gate handles the refusal so every page in the app says the same thing
 * in the same words when somebody arrives where they should not be.
 */
export function StaffDirectory(): ReactNode {
  return (
    <PermissionGate permission="staff.view">
      <StaffTable />
    </PermissionGate>
  );
}
