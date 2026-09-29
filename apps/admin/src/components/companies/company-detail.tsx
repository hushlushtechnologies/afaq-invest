'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { ApiRequestError } from '@afaq/api-client';
import { Breadcrumb, Button, ErrorState, LoadingState, Reveal } from '@afaq/ui';
import { PermissionGate } from '@/components/auth/permission-gate';
import { Link } from '@/i18n/navigation';
import { useCompanyBySlug } from '@/lib/companies/use-companies';
import { CompanyHeader } from './company-header';
import { CompanyOpportunitiesPanel } from './company-opportunities-panel';
import { CompanyOverview } from './company-overview';

/**
 * One company's page, behind its permission.
 *
 * Fetched in the browser by slug rather than rendered on the server: the header
 * has actions that change the company, and they should refresh what is on
 * screen without a full navigation.
 */
export function CompanyDetail({ slug }: { slug: string | undefined }): ReactNode {
  return (
    <PermissionGate permission="company.view">
      <CompanyDetailBody slug={slug} />
    </PermissionGate>
  );
}

function CompanyDetailBody({ slug }: { slug: string | undefined }): ReactNode {
  const t = useTranslations('companies');
  const { data: company, isPending, isError, error, refetch } = useCompanyBySlug(slug);

  const hasSlug = typeof slug === 'string' && slug.trim().length > 0;

  // With no slug the query never runs, so isPending would stay true for ever
  // and the page would sit on a spinner that resolves to nothing. Treat it as
  // what it is: an address that names no company.
  if (hasSlug && isPending) return <LoadingState />;

  if (!hasSlug || isError || !company) {
    // A 404 is a different thing from a broken request: the address is wrong,
    // and no amount of retrying will fix it. Say so, and offer the way back.
    // No slug at all is the same kind of wrong.
    const missing = !hasSlug || (error instanceof ApiRequestError && error.statusCode === 404);

    return (
      <ErrorState
        title={missing ? t('detail.missing.title') : t('detail.loadError.title')}
        description={missing ? t('detail.missing.description') : t('detail.loadError.description')}
        onRetry={missing ? undefined : () => void refetch()}
        actions={
          <Button variant="outline" asChild>
            <Link href="/companies">{t('detail.backToList')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        linkComponent={Link}
        items={[
          { label: t('title'), href: '/companies' },
          // No href on the last item: it is where we already are.
          { label: company.name },
        ]}
      />

      {/* One reveal around the whole page rather than per card: staggering four
          panels on every navigation is the kind of motion that impresses once
          and irritates afterwards. */}
      <Reveal>
        <div className="space-y-4">
          <CompanyHeader company={company} />
          <CompanyOverview company={company} />
          <CompanyOpportunitiesPanel company={company} />
        </div>
      </Reveal>
    </div>
  );
}
