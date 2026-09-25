'use client';

import {
  Banknote,
  BookOpen,
  Building2,
  FileText,
  LayoutDashboard,
  Plus,
  Receipt,
  Scale,
  Users,
  Wallet,
} from 'lucide-react';
import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  LinkTabs,
  NavGroup,
  NavItem,
  PageHeader,
  Pagination,
  SectionHeader,
  StatusBadge,
  Stepper,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const FINANCE_TABS = [
  { href: '#payments', label: 'Payments', icon: <Banknote /> },
  { href: '#ledger', label: 'Ledger', icon: <BookOpen /> },
  { href: '#distributions', label: 'Distributions', icon: <Receipt />, count: 3 },
  { href: '#reconciliation', label: 'Reconciliation', icon: <Scale /> },
];

const ONBOARDING = [
  { label: 'Account', description: 'Email and password' },
  { label: 'Identity', description: 'Passport and Emirates ID' },
  { label: 'Suitability', description: 'Experience and risk' },
  { label: 'Review', description: 'Confirm and submit' },
];

const TOTAL_ITEMS = 245;
const PAGE_SIZE = 10;

export function NavigationShowcase(): ReactNode {
  const [activeSection, setActiveSection] = useState('#payments');
  const [page, setPage] = useState(1);
  const [step, setStep] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  // Stands in for the app's Link, so the showcase can switch sections without leaving the page.
  function DemoLink({ href, ...props }: ComponentPropsWithoutRef<'a'>): ReactNode {
    return (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          if (href) setActiveSection(href);
        }}
      />
    );
  }

  return (
    <>
      <ShowcaseSection title="Page header">
        <Card>
          <PageHeader
            breadcrumb={
              <Breadcrumb
                homeIcon
                items={[
                  { label: 'Dashboard', href: '#' },
                  { label: 'Investors', href: '#' },
                  { label: 'Ahmed Al Mansouri' },
                ]}
              />
            }
            eyebrow="Investor"
            title="Ahmed Al Mansouri"
            description="Joined March 2026 · 4 active investments"
            meta={
              <>
                <StatusBadge status="active" />
                <Badge variant="primary">KYC verified</Badge>
              </>
            }
            actions={
              <>
                <Button variant="outline">Message</Button>
                <Button variant="gradient" iconStart={<Plus />}>
                  New investment
                </Button>
              </>
            }
          />
          <SectionHeader
            className="mt-6"
            title="Holdings"
            description="Section header — smaller than the page title"
            action={
              <Button variant="ghost" size="sm">
                View all
              </Button>
            }
          />
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Tabs — on-page panels">
        <Card className="space-y-8">
          <Tabs defaultValue="overview">
            <TabList label="Investor sections">
              <Tab value="overview">Overview</Tab>
              <Tab value="investments" count={4}>
                Investments
              </Tab>
              <Tab value="documents" count={12}>
                Documents
              </Tab>
              <Tab value="activity">Activity</Tab>
              <Tab value="archived" disabled>
                Archived
              </Tab>
            </TabList>
            <TabPanel value="overview">Overview panel.</TabPanel>
            <TabPanel value="investments">Investments panel.</TabPanel>
            <TabPanel value="documents">Documents panel.</TabPanel>
            <TabPanel value="activity">Activity panel.</TabPanel>
          </Tabs>

          <Tabs defaultValue="monthly" variant="pills">
            <TabList label="Report period">
              <Tab value="monthly">Monthly</Tab>
              <Tab value="quarterly">Quarterly</Tab>
              <Tab value="yearly">Yearly</Tab>
            </TabList>
            <TabPanel value="monthly">Monthly figures.</TabPanel>
            <TabPanel value="quarterly">Quarterly figures.</TabPanel>
            <TabPanel value="yearly">Yearly figures.</TabPanel>
          </Tabs>
          <p className="text-caption text-fg-muted">
            Click a tab, then use the arrow keys. Home and End jump to the ends; disabled tabs are
            skipped.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Link tabs — module sections">
        <Card>
          <LinkTabs
            label="Finance sections"
            items={FINANCE_TABS}
            activeHref={activeSection}
            linkComponent={DemoLink}
          />
          <p className="pt-5 text-body-small text-fg-secondary">
            Showing <span className="font-medium text-fg">{activeSection.slice(1)}</span>. In the
            real app each section is its own address, e.g. /finance/ledger.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Breadcrumb">
        <Card className="space-y-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '#' },
              { label: 'Finance', href: '#' },
              { label: 'Distributions' },
            ]}
          />
          <Breadcrumb
            maxItems={4}
            items={[
              { label: 'Dashboard', href: '#' },
              { label: 'Companies', href: '#' },
              { label: 'Afaq Al Manzil Properties', href: '#' },
              { label: 'Opportunities', href: '#' },
              { label: 'Emerald Tower', href: '#' },
              { label: 'Documents' },
            ]}
          />
          <p className="text-caption text-fg-muted">
            The second trail has six levels; the middle ones collapse into “…”.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Pagination">
        <Card>
          <Pagination
            page={page}
            pageCount={Math.ceil(TOTAL_ITEMS / PAGE_SIZE)}
            onPageChange={setPage}
            totalItems={TOTAL_ITEMS}
            pageSize={PAGE_SIZE}
          />
          <p className="mt-4 text-caption text-fg-muted">
            Narrow the window: the numbers become “Page {page} of 25”.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Stepper">
        <Card className="space-y-8">
          <Stepper steps={ONBOARDING} current={step} label="Investor onboarding" />
          <div className="flex gap-3">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button disabled={step === ONBOARDING.length} onClick={() => setStep(step + 1)}>
              {step >= ONBOARDING.length - 1 ? 'Finish' : 'Next step'}
            </Button>
          </div>
          <div className="max-w-xs">
            <Stepper
              orientation="vertical"
              steps={ONBOARDING}
              current={2}
              label="Vertical example"
            />
          </div>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Nav items and groups">
        <Card className="space-y-4">
          <Switch
            label="Collapsed (icon only)"
            checked={collapsed}
            onChange={(event) => setCollapsed(event.target.checked)}
          />
          <div className="flex flex-wrap items-start gap-6">
            <div
              className={
                collapsed
                  ? 'w-18 rounded-xl bg-sidebar-background p-3'
                  : 'w-64 rounded-xl bg-sidebar-background p-3'
              }
            >
              <NavGroup variant="sidebar" collapsed={collapsed}>
                <NavItem
                  variant="sidebar"
                  collapsed={collapsed}
                  href="#"
                  label="Dashboard"
                  icon={<LayoutDashboard />}
                  active
                />
                <NavItem
                  variant="sidebar"
                  collapsed={collapsed}
                  href="#"
                  label="Investors"
                  icon={<Users />}
                  badge={7}
                />
                <NavItem
                  variant="sidebar"
                  collapsed={collapsed}
                  href="#"
                  label="Companies"
                  icon={<Building2 />}
                />
              </NavGroup>
              <NavGroup variant="sidebar" collapsed={collapsed} title="Finance">
                <NavItem
                  variant="sidebar"
                  collapsed={collapsed}
                  href="#"
                  label="Payments"
                  icon={<Wallet />}
                />
                <NavItem
                  variant="sidebar"
                  collapsed={collapsed}
                  href="#"
                  label="Documents"
                  icon={<FileText />}
                  badge={2}
                />
              </NavGroup>
            </div>

            <div className="w-56 rounded-xl border border-border p-3">
              <NavGroup title="On a light surface">
                <NavItem href="#" label="General" active />
                <NavItem href="#" label="Branding" />
                <NavItem href="#" label="Notifications" badge={3} />
              </NavGroup>
            </div>
          </div>
          <p className="text-caption text-fg-muted">
            Collapsed items show their name in a tooltip on hover and on keyboard focus.
          </p>
        </Card>
      </ShowcaseSection>
    </>
  );
}
