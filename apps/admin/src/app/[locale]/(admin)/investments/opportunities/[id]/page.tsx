import type { ReactNode } from 'react';
import { OpportunityDetail } from '@/components/opportunities/opportunity-detail';

/**
 * One raise: /investments/opportunities/<id>
 *
 * Addressed by id rather than by its slug. The slug is for investors' links
 * in the marketplace; staff links should keep working whatever happens to the
 * title, and the id is the one thing that never changes.
 *
 * No PageShell: the raise's own header card is the page heading.
 */
export default async function OpportunityDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<ReactNode> {
  const { id } = await params;

  return (
    // The same container and padding PageShell uses, so this page lines up
    // with every other one even though it supplies its own heading.
    <section className="container-page page-padding">
      <OpportunityDetail id={id} />
    </section>
  );
}
