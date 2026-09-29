import type { ReactNode } from 'react';
import { CompanyDetail } from '@/components/companies/company-detail';

/**
 * One company: /companies/afaq-al-manzil-properties
 *
 * Addressed by slug rather than id. The slug is readable, and it never changes
 * once the company is created — so a link somebody bookmarks or sends a
 * colleague keeps working after a rename.
 *
 * No PageShell here: the company's own header card is the page heading, and a
 * second title above it would say the same thing twice.
 */
export default async function CompanyDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<ReactNode> {
  const { slug } = await params;

  return (
    // The same container and padding PageShell uses, so this page lines up with
    // every other one even though it supplies its own heading.
    <section className="container-page page-padding">
      <CompanyDetail slug={slug} />
    </section>
  );
}
