'use client';

import { Download, Eye, Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  DataTable,
  FilterBar,
  RowActions,
  Select,
  StatusBadge,
  TableToolbar,
  createDataTableColumns,
  type ActiveFilter,
  type StatusKind,
} from '@afaq/ui';
import { formatCurrency } from '@afaq/utils';
import { useDataTableLabels, useTableToolbarLabels } from '@/lib/i18n/use-component-labels';
import { ShowcaseSection } from './showcase-section';

interface DemoInvestor {
  id: string;
  name: string;
  email: string;
  company: string;
  companyType: 'INTERNAL' | 'THIRD_PARTY';
  status: StatusKind;
  invested: number;
  joined: string;
}

const FIRST = [
  'Ahmed',
  'Fatima',
  'Omar',
  'Layla',
  'Khalid',
  'Mariam',
  'Yousef',
  'Noura',
  'Hassan',
  'Aisha',
];
const LAST = [
  'Al Mansouri',
  'Hassan',
  'Khalid',
  'Ibrahim',
  'Al Nahyan',
  'Saeed',
  'Rahman',
  'Al Falasi',
];
const COMPANIES: Array<[string, DemoInvestor['companyType']]> = [
  ['Afaq Al Manzil Properties', 'INTERNAL'],
  ['Hush Lush Hospitality', 'INTERNAL'],
  ['Optimus Megatron Cars', 'INTERNAL'],
  ['Gulf Horizon Partners', 'THIRD_PARTY'],
];
const STATUSES: StatusKind[] = [
  'active',
  'active',
  'active',
  'pending',
  'under-review',
  'suspended',
];

// Deterministic sample data — the same 57 rows on every load.
const INVESTORS: DemoInvestor[] = Array.from({ length: 57 }, (_, index) => {
  const first = FIRST[index % FIRST.length] ?? 'Ahmed';
  const last = LAST[(index * 3) % LAST.length] ?? 'Hassan';
  const [company, companyType] = COMPANIES[index % COMPANIES.length] ?? COMPANIES[0]!;
  return {
    id: `inv-${String(index + 1).padStart(3, '0')}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${index + 1}@example.ae`,
    company,
    companyType,
    status: STATUSES[index % STATUSES.length] ?? 'active',
    invested: 50_000 + ((index * 7919) % 40) * 62_500,
    joined: new Date(Date.UTC(2025, index % 12, 1 + (index % 27))).toISOString().slice(0, 10),
  };
});

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'under-review', label: 'Under review' },
  { value: 'suspended', label: 'Suspended' },
];

type DemoState = 'data' | 'loading' | 'empty' | 'error';

// One shared empty array — a new [] on every render would make the table recalculate.
const NO_INVESTORS: DemoInvestor[] = [];

export function TableShowcase(): ReactNode {
  const tableLabels = useDataTableLabels();
  const toolbarLabels = useTableToolbarLabels();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<DemoInvestor[]>([]);
  const [demoState, setDemoState] = useState<DemoState>('data');
  const [lastEvent, setLastEvent] = useState('none yet');
  // Changing this key remounts the table, which clears its selection.
  const [tableKey, setTableKey] = useState(0);

  const columns = useMemo(() => {
    const col = createDataTableColumns<DemoInvestor>();
    return col.columns([
      col.accessor('name', {
        header: 'Investor',
        meta: { mobile: 'title' },
        cell: ({ row }) => (
          <span className="flex items-center gap-3">
            <Avatar name={row.original.name} size="sm" className="max-md:hidden" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{row.original.name}</span>
              <span className="block truncate text-caption text-fg-muted">
                {row.original.email}
              </span>
            </span>
          </span>
        ),
      }),
      col.accessor('company', { header: 'Company', meta: { mobile: 'subtitle' } }),
      col.accessor('companyType', {
        header: 'Type',
        cell: ({ getValue }) => (
          <Badge size="sm" variant={getValue() === 'INTERNAL' ? 'primary' : 'outline'}>
            {getValue() === 'INTERNAL' ? 'Internal' : 'Third party'}
          </Badge>
        ),
      }),
      col.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" />,
      }),
      col.accessor('invested', {
        header: 'Invested',
        enableGlobalFilter: false,
        meta: { align: 'end' },
        cell: ({ getValue }) => (
          <span className="text-numeric text-fg" dir="ltr">
            {formatCurrency(getValue())}
          </span>
        ),
      }),
      col.accessor('joined', { header: 'Joined', enableGlobalFilter: false }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        meta: { mobile: 'actions', align: 'end', width: '3.5rem' },
        cell: ({ row }) => (
          <RowActions
            label={`Actions for ${row.original.name}`}
            actions={[
              {
                label: 'View',
                icon: <Eye />,
                onSelect: () => setLastEvent(`View ${row.original.name}`),
              },
              {
                label: 'Edit',
                icon: <Pencil />,
                onSelect: () => setLastEvent(`Edit ${row.original.name}`),
              },
              {
                label: 'Email',
                icon: <Mail />,
                onSelect: () => setLastEvent(`Email ${row.original.name}`),
              },
              {
                label: 'Delete',
                icon: <Trash2 />,
                tone: 'danger',
                separated: true,
                onSelect: () => setLastEvent(`Delete ${row.original.name}`),
              },
            ]}
          />
        ),
      }),
    ]);
  }, []);

  const filtered = useMemo(
    () => (status ? INVESTORS.filter((investor) => investor.status === status) : INVESTORS),
    [status],
  );

  const activeFilters: ActiveFilter[] = status
    ? [
        {
          id: 'status',
          label: 'Status',
          value: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
        },
      ]
    : [];

  const data = demoState === 'empty' ? NO_INVESTORS : filtered;

  function clearSelection(): void {
    setSelected([]);
    setTableKey((key) => key + 1);
  }

  return (
    <ShowcaseSection title="Data table">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-caption text-fg-muted">Demo state:</span>
          <ButtonGroup label="Demo state">
            {(['data', 'loading', 'empty', 'error'] as const).map((state) => (
              <Button
                key={state}
                size="sm"
                variant={demoState === state ? 'primary' : 'outline'}
                onClick={() => setDemoState(state)}
              >
                {state}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <TableToolbar
          {...toolbarLabels}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, email or company"
          filters={
            <Select
              fieldSize="sm"
              aria-label="Filter by status"
              wrapperClassName="w-44"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
            />
          }
          actions={
            <>
              <Button variant="outline" size="sm" iconStart={<Download />}>
                Export
              </Button>
              <Button variant="gradient" size="sm" iconStart={<Plus />}>
                Add investor
              </Button>
            </>
          }
          selectedCount={selected.length}
          onClearSelection={clearSelection}
          bulkActions={
            <>
              <Button size="sm" variant="outline" iconStart={<Mail />}>
                Email
              </Button>
              <Button size="sm" variant="danger" iconStart={<Trash2 />}>
                Delete
              </Button>
            </>
          }
        />

        <FilterBar filters={activeFilters} onRemove={() => setStatus('')} />

        <DataTable
          labels={tableLabels}
          key={tableKey}
          caption="Investors"
          data={data}
          columns={columns}
          getRowId={(investor) => investor.id}
          search={search}
          onClearSearch={() => setSearch('')}
          loading={demoState === 'loading'}
          error={
            demoState === 'error' ? 'The server did not respond. Check your connection.' : null
          }
          onRetry={() => setDemoState('data')}
          empty={{
            title: 'No investors yet',
            description: 'Investors appear here once they register or are added by staff.',
            action: (
              <Button size="sm" variant="gradient" iconStart={<Plus />}>
                Add investor
              </Button>
            ),
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          enableSelection
          onSelectionChange={setSelected}
          onRowClick={(investor) => setLastEvent(`Opened ${investor.name}`)}
        />

        <p className="text-caption text-fg-muted">
          Last event:{' '}
          <span className="text-fg" data-testid="table-event">
            {lastEvent}
          </span>
          . Click a column heading to sort; narrow the window to see rows become cards.
        </p>
      </div>
    </ShowcaseSection>
  );
}
