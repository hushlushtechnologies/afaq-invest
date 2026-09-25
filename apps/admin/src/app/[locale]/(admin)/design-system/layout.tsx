import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getEnvironment } from '@/config/app-meta';

/**
 * The design system is an internal reference, not part of the product.
 *
 * In production it does not exist: the request 404s exactly as an unknown
 * address would, so nobody can tell the page was ever there. Development and
 * staging keep it, which is where it is actually useful.
 *
 * Set NEXT_PUBLIC_APP_ENV=production in your production deployment.
 */
export const metadata: Metadata = {
  title: 'Design System — Afaq Invest',
  // Belt and braces: even if it were reachable, search engines should skip it.
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  if (getEnvironment() === 'production') {
    notFound();
  }

  return children;
}
