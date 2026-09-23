import type { ReactNode } from 'react';

export interface ShowcaseSectionProps {
  title: string;
  children: ReactNode;
}

/** A labelled block on the design-system page. */
export function ShowcaseSection({ title, children }: ShowcaseSectionProps): ReactNode {
  return (
    <section>
      <h2 className="mb-4 text-overline text-fg">{title}</h2>
      {children}
    </section>
  );
}
