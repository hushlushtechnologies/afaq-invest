'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { RolesGrid } from './roles-grid';

/**
 * Roles and permissions, behind the permission to see them.
 *
 * The gate handles the refusal so every page in the app says the same thing
 * in the same words when somebody arrives where they should not be.
 */
export function RolesDirectory(): ReactNode {
  return (
    <PermissionGate permission="role.view">
      <RolesGrid />
    </PermissionGate>
  );
}
