'use client';

import { ApiRequestError } from '@afaq/api-client';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { RoleListItem } from '@afaq/types';
import {
  Button,
  Drawer,
  FormDescription,
  FormField,
  FormLabel,
  InfoCard,
  Input,
  LoadingState,
  Textarea,
} from '@afaq/ui';
import { usePermissionCatalogue, useRole } from '@/lib/roles/use-roles';
import { useCreateRole, useUpdateRole } from '@/lib/roles/use-role-mutations';
import { PermissionSelector } from './permission-selector';

/**
 * Creating or changing a custom role.
 *
 * One drawer for both, because the fields are identical — the only real
 * difference is whether an existing role's permissions are loaded first.
 */
export function RoleFormDrawer({
  open,
  role,
  onClose,
}: {
  open: boolean;
  /** null when creating. */
  role: RoleListItem | null;
  onClose: () => void;
}): ReactNode {
  const t = useTranslations('roles.form');
  const create = useCreateRole();
  const update = useUpdateRole();

  const catalogue = usePermissionCatalogue();
  const detail = useRole(role?.id ?? null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Fill the form once, when the drawer opens for a given role (or for a new
  // one). Done during render so nothing from the previous role is painted.
  const formKey = open ? (role?.id ?? 'new') : null;

  if (formKey !== null && formKey !== loadedFor) {
    // Wait for an existing role's permissions before claiming to have loaded
    // it; otherwise saving immediately would wipe them.
    if (role === null || detail.data) {
      setLoadedFor(formKey);
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setSelected(role === null ? [] : [...(detail.data?.permissionKeys ?? [])]);
      setFailure(null);
    }
  }

  if (formKey === null && loadedFor !== null) setLoadedFor(null);

  const isReady = catalogue.data !== undefined && (role === null || detail.data !== undefined);
  const isSaving = create.isPending || update.isPending;
  const canSave = name.trim().length >= 2 && selected.length > 0;

  async function save(): Promise<void> {
    setFailure(null);

    try {
      if (role) {
        await update.mutateAsync({
          id: role.id,
          name: name.trim(),
          description: description.trim(),
          permissionKeys: selected,
        });
      } else {
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permissionKeys: selected,
        });
      }

      onClose();
    } catch (error) {
      // The API names the permission it objected to, which is the useful part.
      setFailure(error instanceof ApiRequestError ? error.message : t('failed'));
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="end"
      size="lg"
      title={role ? t('editTitle') : t('createTitle')}
      description={role ? role.key : t('createDescription')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            iconStart={<Save />}
            loading={isSaving}
            disabled={!canSave || !isReady}
            onClick={save}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {failure ? (
          <InfoCard tone="danger" announce>
            {failure}
          </InfoCard>
        ) : null}

        {/* Changing a role changes it for everyone who holds it, which is not
            obvious from a form that looks like it edits one thing. */}
        {role && role.staffCount > 0 ? (
          <InfoCard tone="warning">{t('affectsStaff', { count: role.staffCount })}</InfoCard>
        ) : null}

        <FormField required>
          <FormLabel>{t('name')}</FormLabel>
          <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          {role ? <FormDescription>{t('keyFixed')}</FormDescription> : null}
        </FormField>

        <FormField>
          <FormLabel>{t('description')}</FormLabel>
          <Textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>

        <div className="space-y-2">
          <h2 className="text-label font-medium text-fg">{t('permissions')}</h2>
          <FormDescription>{t('permissionsHelp')}</FormDescription>

          {isReady ? (
            <PermissionSelector
              groups={catalogue.data ?? []}
              selected={selected}
              onChange={setSelected}
            />
          ) : (
            <LoadingState />
          )}
        </div>
      </div>
    </Drawer>
  );
}
