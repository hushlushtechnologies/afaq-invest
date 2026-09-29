'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Globe, Mail, Phone } from 'lucide-react';
import type { CompanyDetail } from '@afaq/types';
import { Card, CardBody, CardHeader, InfoCard } from '@afaq/ui';

/** One labelled fact. Renders nothing at all when there is nothing to say. */
function Detail({
  icon,
  label,
  value,
  href,
  dir,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  href?: string;
  dir?: 'ltr';
}): ReactNode {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-fg-muted">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-fg-muted">{label}</span>
        {href ? (
          <a
            href={href}
            {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            // dir="ltr" on emails, phone numbers and addresses: in an Arabic
            // layout they would otherwise be reordered and read as nonsense.
            dir={dir}
            className="truncate text-body-small text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {value}
          </a>
        ) : (
          <span dir={dir} className="truncate text-body-small text-fg-secondary">
            {value}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * What the company does, and how to reach them.
 *
 * Two cards rather than one long list: the description is prose to read, the
 * contact details are facts to look up, and they are wanted at different moments.
 */
export function CompanyOverview({ company }: { company: CompanyDetail }): ReactNode {
  const t = useTranslations('companies.detail');
  // A second namespace rather than a relative key: next-intl has no "../".
  const tStatus = useTranslations('companies.status');

  const hasContact = Boolean(company.website ?? company.contactEmail ?? company.contactPhone);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title={t('about')} />
        <CardBody>
          {company.description ? (
            // whitespace-pre-line so paragraph breaks typed into the form
            // survive to the page.
            <p className="text-body whitespace-pre-line text-fg-secondary">{company.description}</p>
          ) : (
            <p className="text-body-small text-fg-muted">{t('noDescription')}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('contact')} />
        <CardBody>
          {hasContact ? (
            <div className="space-y-4">
              <Detail
                icon={<Globe className="size-4" />}
                label={t('website')}
                value={company.website}
                href={company.website ?? undefined}
                dir="ltr"
              />
              <Detail
                icon={<Mail className="size-4" />}
                label={t('email')}
                value={company.contactEmail}
                href={company.contactEmail ? `mailto:${company.contactEmail}` : undefined}
                dir="ltr"
              />
              <Detail
                icon={<Phone className="size-4" />}
                label={t('phone')}
                value={company.contactPhone}
                href={
                  company.contactPhone
                    ? `tel:${company.contactPhone.replace(/\s/g, '')}`
                    : undefined
                }
                dir="ltr"
              />
            </div>
          ) : (
            <p className="text-body-small text-fg-muted">{t('noContact')}</p>
          )}
        </CardBody>
      </Card>

      {/*
       * Said once, plainly, when it is true. `acceptsInvestment` is decided by
       * the API from the shared predicate, so this panel and the investor
       * marketplace can never disagree about whether the company is open.
       */}
      {!company.acceptsInvestment ? (
        <div className="lg:col-span-3">
          <InfoCard tone="warning" title={t('closed.title')}>
            {company.status !== 'ACTIVE'
              ? t('closed.notActive', { status: tStatus(company.status) })
              : t('closed.notVerified')}
          </InfoCard>
        </div>
      ) : null}
    </div>
  );
}
