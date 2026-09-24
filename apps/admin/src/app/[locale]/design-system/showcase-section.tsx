import { Link2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ShowcaseSectionProps {
  title: string;
  /** Override the anchor. By default it is made from the title. */
  id?: string;
  children: ReactNode;
}

/** "Buttons — sizes" → "buttons-sizes" */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * A labelled block on the design-system page. Each one is a jump target, so a
 * particular component can be linked directly — "have a look at #buttons-sizes".
 * The contents list is built from these at runtime, so it can never drift out
 * of step with the page.
 */
export function ShowcaseSection({ title, id, children }: ShowcaseSectionProps): ReactNode {
  const anchor = id ?? slugify(title);

  return (
    <section
      id={anchor}
      data-showcase-section={anchor}
      aria-labelledby={`${anchor}-heading`}
      // Leaves room for the sticky topbar however the section is reached —
      // a #link, the contents list, or scrollIntoView.
      className="scroll-mt-[4.5rem]"
    >
      <h2
        id={`${anchor}-heading`}
        className="group mb-4 flex items-center gap-2 text-overline text-fg"
      >
        {title}
        <a
          href={`#${anchor}`}
          aria-label={`Link to ${title}`}
          className="rounded text-fg-muted opacity-0 transition-opacity outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link2 className="size-3.5" aria-hidden="true" />
        </a>
      </h2>
      {children}
    </section>
  );
}
