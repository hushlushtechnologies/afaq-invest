import { ChevronRight, Home } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Leave out for the current page. */
  href?: string;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  /** Pass the app's locale-aware Link. Defaults to a plain <a>. */
  linkComponent?: ElementType;
  /** Above this many items, the middle ones collapse into "…". */
  maxItems?: number;
  /** Show a home icon instead of the first item's text. */
  homeIcon?: boolean;
  label?: string;
  className?: string;
}

export function Breadcrumb({
  items,
  linkComponent: LinkComponent = 'a',
  maxItems = 4,
  homeIcon = false,
  label = 'Breadcrumb',
  className,
}: BreadcrumbProps): ReactNode {
  // Keep the first item and the last (maxItems - 2); collapse everything between.
  const collapsed = items.length > maxItems;
  const visible: Array<BreadcrumbItem | 'ellipsis'> = collapsed
    ? [items[0] as BreadcrumbItem, 'ellipsis', ...items.slice(items.length - (maxItems - 2))]
    : [...items];

  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-body-small">
        {visible.map((item, index) => {
          const last = index === visible.length - 1;
          const first = index === 0;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {item === 'ellipsis' ? (
                <span className="text-fg-muted" aria-label="More pages">
                  …
                </span>
              ) : last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className="font-medium text-fg">
                  {item.label}
                </span>
              ) : (
                <LinkComponent
                  href={item.href}
                  className="inline-flex items-center rounded text-fg-subtle transition-colors outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {first && homeIcon ? (
                    <>
                      <Home className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </LinkComponent>
              )}
              {!last ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-fg-muted rtl:rotate-180"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
