'use client';

import { Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { RoleListItem } from '@afaq/types';
import { ApiRequestError } from '@afaq/api-client';
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  ErrorState,
  IconButton,
  LoadingState,
} from '@afaq/ui';
import { Can } from '@/components/auth/can';
import { usePermissions } from '@/lib/auth/use-permissions';
import { useDeleteRole } from '@/lib/roles/use-role-mutations';
import { useRoles } from '@/lib/roles/use-roles';
import { RoleDetailDrawer } from './role-detail-drawer';
import { RoleFormDrawer } from './role-form-drawer';

/**
 * The roles, as cards rather than a table.
 *
 * There are eight system roles plus whatever custom ones exist — a set small
 * enough to see at once, where each entry has a description worth reading.
 * A table would force that description into a cramped column.
 */
export function RolesGrid(): ReactNode {
  const t = useTranslations('roles');
  const tActions = useTranslations('actions');
  const { can } = usePermissions();
  const { data, isPending, isError, refetch } = useRoles();
  const deleteRole = useDeleteRole();

  const [viewing, setViewing] = useState<RoleListItem | null>(null);
  const [editing, setEditing] = useState<RoleListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<RoleListItem | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<string | null>(null);

  if (isPending) return <LoadingState />;

  if (isError) {
    return (
      <ErrorState
        title={t('loadFailedTitle')}
        description={t('loadFailedDescription')}
        onRetry={() => void refetch()}
      />
    );
  }

  const systemRoles = data.filter((role) => role.isSystem);
  const customRoles = data.filter((role) => !role.isSystem);

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    setDeleteFailure(null);

    try {
      await deleteRole.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (error) {
      // "2 staff still hold this role" tells them what to do next, so it has
      // to survive; rethrowing keeps the dialog open to show it.
      setDeleteFailure(error instanceof ApiRequestError ? error.message : t('deleteFailed'));
      throw error;
    }
  }

  return (
    <div className="space-y-8">
      <Can permission="role.create">
        <div className="flex justify-end">
          <Button variant="primary" iconStart={<Plus />} onClick={() => setCreating(true)}>
            {t('createRole')}
          </Button>
        </div>
      </Can>

      <RoleSection
        title={t('systemRoles')}
        description={t('systemRolesHelp')}
        roles={systemRoles}
        onOpen={setViewing}
      />

      {/* Only shown once custom roles exist; an empty heading explains nothing. */}
      {customRoles.length > 0 ? (
        <RoleSection
          title={t('customRoles')}
          description={t('customRolesHelp')}
          roles={customRoles}
          onOpen={setViewing}
          // Only custom roles can be changed; built-in ones are re-seeded on
          // deploy, so edit and delete controls there would be a false promise.
          onEdit={can('role.edit') ? setEditing : undefined}
          onDelete={can('role.delete') ? setDeleting : undefined}
        />
      ) : null}

      <RoleDetailDrawer role={viewing} onClose={() => setViewing(null)} />

      <RoleFormDrawer
        open={creating || editing !== null}
        role={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmationDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          setDeleteFailure(null);
        }}
        onConfirm={confirmDelete}
        tone="danger"
        title={t('deleteTitle', { name: deleting?.name ?? '' })}
        message={deleteFailure ?? t('deleteBody')}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={tActions('cancel')}
      />
    </div>
  );
}

function RoleSection({
  title,
  description,
  roles,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  roles: RoleListItem[];
  onOpen: (role: RoleListItem) => void;
  onEdit?: (role: RoleListItem) => void;
  onDelete?: (role: RoleListItem) => void;
}): ReactNode {
  const t = useTranslations('roles');

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-heading-6 text-fg">{title}</h2>
        <p className="text-body-small text-fg-muted">{description}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <li key={role.id}>
            {/* The whole card is the control, so it is a real button: a div
                with a click handler cannot be reached by keyboard. */}
            <button
              type="button"
              onClick={() => onOpen(role)}
              aria-label={t('viewRole', { name: role.name })}
              className="h-full w-full rounded-xl text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card interactive className="flex h-full flex-col gap-3">
                <div className="space-y-1">
                  <span className="block text-label font-medium text-fg">{role.name}</span>
                  <span className="block text-body-small text-fg-muted">
                    {role.description ?? t('noDescription')}
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="sm" icon={<ShieldCheck />}>
                    {role.isSuperAdmin
                      ? t('allPermissions')
                      : t('permissionCount', { count: role.permissionCount })}
                  </Badge>
                  <Badge variant="neutral" size="sm" icon={<Users />}>
                    {t('staffCount', { count: role.staffCount })}
                  </Badge>
                </div>
              </Card>
            </button>

            {/* Outside the card button: a button inside a button is invalid
                markup and the inner one never receives the click. */}
            {onEdit || onDelete ? (
              <div className="mt-1.5 flex justify-end gap-1">
                {onEdit ? (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label={t('editRole', { name: role.name })}
                    icon={<Pencil />}
                    onClick={() => onEdit(role)}
                  />
                ) : null}
                {onDelete ? (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-danger-strong"
                    label={t('deleteRole', { name: role.name })}
                    icon={<Trash2 />}
                    onClick={() => onDelete(role)}
                  />
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
