'use client';

import type { ReactNode } from 'react';
import { InfoCard } from '@afaq/ui';
import type { OpportunityFailure } from '@/lib/opportunities/use-opportunity-failure';

/**
 * A refusal, with every reason it gave.
 *
 * The list matters: "the opportunity was refused" on its own sends somebody
 * hunting, where "the target is below the minimum of AED 10,000" tells them
 * exactly which field to change.
 */
export function OpportunityFailureCard({
  failure,
}: {
  failure: OpportunityFailure | null;
}): ReactNode {
  if (!failure) return null;

  return (
    <InfoCard tone="danger" announce>
      <span className="flex flex-col gap-2">
        <span>{failure.message}</span>
        {failure.issues.length > 0 ? (
          <ul className="list-disc space-y-1 ps-5">
            {failure.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
      </span>
    </InfoCard>
  );
}
