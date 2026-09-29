'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { ExternalLink, PencilLine, Star } from 'lucide-react';

import type { CompanyDetail, Locale } from '@afaq/types';

import { Avatar, Badge, Button, Card } from '@afaq/ui';
import { formatDate } from '@afaq/utils';

import { CompanyStatusBadge, CompanyTypeBadge, CompanyVerificationBadge } from './company-badges';

import { Can } from '@/components/auth/can';
import { CompanyRowActions } from './company-row-actions';
import { EditCompanyDrawer } from './edit-company-drawer';

/**
 * The top of a company's page: who they are, at a glance.
 *
 * A cover band rather than a plain header. It is the one place on the screen
 * where the brand gradient earns its keep, and it gives the logo something to
 * sit against so a company with no uploaded image still looks deliberate rather
 * than unfinished.
 */
export function CompanyHeader({ company }: { company: CompanyDetail }): ReactNode {
  const t = useTranslations('companies');
  const locale = useLocale() as Locale;
  const [editing, setEditing] = useState(false);

  return (
    <Card padding="none" className="overflow-hidden">
      {/* The cover image when there is one, the brand gradient when there is
          not — never an empty grey block. */}
      <div
        className="relative h-24 gradient-primary sm:h-32"
        style={
          company.coverImageUrl
            ? {
                backgroundImage: `url(${company.coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Keeps the badges legible over any photograph. */}
        {company.coverImageUrl ? (
          <span aria-hidden="true" className="absolute inset-0 bg-black/25" />
        ) : null}

        <span className="absolute end-4 top-4 flex flex-wrap items-center gap-2">
          {company.isFeatured ? (
            <Badge size="sm" variant="warning">
              <Star aria-hidden="true" className="me-1 size-3 fill-current" />
              {t('featured')}
            </Badge>
          ) : null}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Pulled up so the logo straddles the band, which reads as one piece
            rather than two stacked boxes. */}
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="flex items-end gap-4">
            <span className="rounded-2xl bg-surface p-1 shadow-card">
              <Avatar name={company.name} src={company.logoUrl ?? undefined} size="xl" />
            </span>
          </div>

          <span className="flex items-center gap-2">
            {/* Editing details lives here rather than in the list: the list's
                menu is for quick state changes, and an edit form wants the
                company you are already looking at. */}
            <Can permission="company.edit">
              <Button variant="outline" iconStart={<PencilLine />} onClick={() => setEditing(true)}>
                {t('edit.action')}
              </Button>
            </Can>

            <CompanyRowActions company={company} />
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-h3 font-semibold text-fg">{company.name}</h1>

            {company.legalName ? (
              <p className="text-body-small text-fg-muted">{company.legalName}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" variant="neutral">
              {company.sector}
            </Badge>

            <CompanyTypeBadge type={company.type} />

            <CompanyStatusBadge status={company.status} />

            <CompanyVerificationBadge verification={company.verification} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-muted">
            <span>
              {t('detail.addedOn', {
                date: formatDate(company.createdAt, {
                  locale,
                  style: 'long',
                }),
              })}
            </span>

            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t('detail.visitWebsite')}

                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <EditCompanyDrawer company={editing ? company : null} onClose={() => setEditing(false)} />
    </Card>
  );
}
