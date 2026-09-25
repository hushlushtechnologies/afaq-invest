'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { UserPlus } from 'lucide-react';

import { STAFF_STATUSES, type Locale, type StaffListItem, type StaffListQuery } from '@afaq/types';

import {
  Badge,
  Button,
  createDataTableColumns,
  DataTable,
  FilterBar,
  TableToolbar,
  type ActiveFilter,
} from '@afaq/ui';
import { formatDate, formatRelativeTime } from '@afaq/utils';
import { Can } from '@/components/auth/can';

import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { useRoles } from '@/lib/roles/use-roles';
import { useStaffList } from '@/lib/staff/use-staff-list';
import { EditRolesDrawer } from './edit-roles-drawer';
import { EditStaffDrawer } from './edit-staff-drawer';
import { InviteStaffDrawer } from './invite-staff-drawer';
import { StaffRowActions } from './staff-row-actions';

import { StaffStatusBadge } from './staff-status-badge';

const column = createDataTableColumns<StaffListItem>();

/**
 * The staff directory.
 *
 * Search, filters and paging all live in the address the API is asked for,
 * rather than being applied to a list held in the browser — so the table
 * behaves the same with twelve staff or twelve hundred.
 */
export function StaffTable(): ReactNode {
  const t = useTranslations('staff');
  const locale = useLocale() as Locale;
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();

  const [query, setQuery] = useState<StaffListQuery>({ page: 1, pageSize: 25 });
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffListItem | null>(null);
  // Roles come from the API so custom roles appear in the filter too.
  const { data: roles } = useRoles();
  const [editingRoles, setEditingRoles] = useState<StaffListItem | null>(null);
  const { data, isPending, isError, refetch } = useStaffList({
    ...query,
    search: search || undefined,
  });

  /** Any change other than paging returns to the first page. */
  function narrow(changes: Partial<StaffListQuery>): void {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  const columns = useMemo(
    () => [
      column.accessor('fullName', {
        header: t('columns.name'),
        meta: { mobile: 'title' },
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span className="font-medium text-fg">{row.original.fullName}</span>
            <span className="text-caption text-fg-muted" dir="ltr">
              {row.original.email}
            </span>
          </span>
        ),
      }),
      column.accessor('roles', {
        header: t('columns.roles'),
        enableSorting: false,
        meta: { mobile: 'field', label: t('columns.roles') },
        cell: ({ row }) =>
          row.original.roles.length === 0 ? (
            <span className="text-fg-muted">{t('noRoles')}</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {row.original.roles.map((role) => (
                <Badge key={role.key} size="sm" variant="neutral">
                  {role.name}
                </Badge>
              ))}
            </span>
          ),
      }),
      column.accessor('status', {
        header: t('columns.status'),
        meta: { mobile: 'field', label: t('columns.status') },
        cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
      }),
      column.accessor('lastSeenAt', {
        header: t('columns.lastActivity'),
        meta: { mobile: 'field', label: t('columns.lastActivity') },
        cell: ({ row }) => {
          const when = row.original.lastSeenAt ?? row.original.lastLoginAt;
          return when ? (
            <span className="text-fg-secondary">{formatRelativeTime(when, { locale })}</span>
          ) : (
            <span className="text-fg-muted">{t('never')}</span>
          );
        },
      }),
      column.accessor('createdAt', {
        header: t('columns.added'),
        meta: { mobile: 'field', label: t('columns.added') },
        cell: ({ row }) => (
          <span className="text-fg-secondary">
            {formatDate(row.original.createdAt, { locale, style: 'short' })}
          </span>
        ),
      }),
      column.display({
        id: 'actions',
        header: '',
        meta: { align: 'end' },
        cell: ({ row }) => (
          <StaffRowActions staff={row.original} onEdit={setEditing} onEditRoles={setEditingRoles} />
        ),
      }),
    ],
    [t, locale],
  );

  // Every filter in use, so each can be removed on its own.
  const chips: ActiveFilter[] = [
    ...(query.status
      ? [{ id: 'status', label: t('filters.status'), value: t(`status.${query.status}`) }]
      : []),
    ...(query.role
      ? [
          {
            id: 'role',
            label: t('filters.role'),
            value: roles?.find((role) => role.key === query.role)?.name ?? query.role,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        {...toolbarLabels}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('searchPlaceholder')}
        actions={
          <Can permission="staff.create">
            <Button variant="gradient" iconStart={<UserPlus />} onClick={() => setInviting(true)}>
              {t('invite.action')}
            </Button>
          </Can>
        }
        filters={
          <>
            <select
              aria-label={t('filters.status')}
              value={query.status ?? ''}
              onChange={(event) =>
                narrow({ status: (event.target.value || undefined) as StaffListQuery['status'] })
              }
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filters.allStatuses')}</option>
              {STAFF_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>

            <select
              aria-label={t('filters.role')}
              value={query.role ?? ''}
              onChange={(event) => narrow({ role: event.target.value || undefined })}
              className="h-8 rounded-lg border border-border bg-surface px-2.5 text-body-small text-fg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('filters.allRoles')}</option>
              {(roles ?? []).map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      {chips.length > 0 ? (
        <FilterBar
          filters={chips}
          onRemove={(id) => narrow({ [id]: undefined } as Partial<StaffListQuery>)}
          onClearAll={() =>
            setQuery((current) => ({ ...current, status: undefined, role: undefined, page: 1 }))
          }
        />
      ) : null}

      <DataTable
        caption={t('title')}
        data={data?.items}
        columns={columns}
        getRowId={(staff) => staff.id}
        loading={isPending}
        error={isError ? t('loadError') : null}
        onRetry={() => void refetch()}
        search={search}
        onClearSearch={() => setSearch('')}
        empty={{
          title: t('empty.title'),
          description: t('empty.description'),
          action: (
            <Button variant="outline" onClick={() => void refetch()}>
              {t('empty.refresh')}
            </Button>
          ),
        }}
        labels={tableLabels}
        pageSize={query.pageSize ?? 25}
        pageSizeOptions={[10, 25, 50]}
      />
      <InviteStaffDrawer open={inviting} onClose={() => setInviting(false)} />
      <EditStaffDrawer staff={editing} onClose={() => setEditing(null)} />
      <EditRolesDrawer staff={editingRoles} onClose={() => setEditingRoles(null)} />
    </div>
  );
}
