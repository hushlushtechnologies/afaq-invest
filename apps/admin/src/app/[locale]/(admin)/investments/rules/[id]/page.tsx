import type { ReactNode } from 'react';
import { RuleSetDetail } from '@/components/investment-rules/rule-set-detail';

/**
 * One rule set: /investments/rules/<id>
 *
 * Addressed by id rather than a slug. Unlike a company, a rule set has no
 * readable natural name — there are several versions of "Starter ladder" and
 * only the id distinguishes them.
 *
 * No PageShell: the rule set's own header card is the page heading, and a
 * second title above it would say the same thing twice.
 */
export default async function RuleSetDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>): Promise<ReactNode> {
  const { id } = await params;

  return (
    // The same container and padding PageShell uses, so this page lines up
    // with every other one even though it supplies its own heading.
    <section className="container-page page-padding">
      <RuleSetDetail id={id} />
    </section>
  );
}
