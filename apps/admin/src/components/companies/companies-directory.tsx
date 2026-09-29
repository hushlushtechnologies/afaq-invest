'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { CompaniesTable } from './companies-table';

/**
 * The company directory, behind its permission.
 *
 * The gate handles the refusal, so every page in the app says the same thing in
 * the same words when somebody arrives where they should not be — and says
 * something different again when it could not find out.
 */
export function CompaniesDirectory(): ReactNode {
  return (
    <PermissionGate permission="company.view">
      <CompaniesTable />
    </PermissionGate>
  );
}
