'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { PieChart } from 'lucide-react';
import type { CompanyDetail } from '@afaq/types';
import { Card, CardBody, CardHeader, EmptyState } from '@afaq/ui';

/**
 * Where this company's investment opportunities will appear.
 *
 * Opportunities do not exist yet — they arrive with the investment engine — so
 * this shows an honest empty state and no numbers. Deliberately not a mocked
 * chart or a sample figure: a made-up return on an investment page is the one
 * kind of placeholder that could mislead somebody into a real decision.
 *
 * It is here rather than left out so the shape of the page is settled now, and
 * the later phase fills a panel that already has its place.
 */
export function CompanyOpportunitiesPanel({ company }: { company: CompanyDetail }): ReactNode {
  const t = useTranslations('companies.detail.opportunities');

  return (
    <Card>
      <CardHeader title={t('title')} description={t('description')} />
      <CardBody>
        <EmptyState
          kind="no-data"
          size="sm"
          icon={<PieChart />}
          title={t('empty.title')}
          description={
            company.acceptsInvestment
              ? t('empty.description', { name: company.name })
              : t('empty.blocked', { name: company.name })
          }
        />
      </CardBody>
    </Card>
  );
}
