/**
 * Example investment opportunities, for development only.
 *
 * Unlike everything else the seed writes, these are off by default. The
 * permissions, roles, companies and starter ladder are configuration the
 * platform needs to run. An opportunity is something else: a public claim that
 * a named, real company is raising a stated amount. Writing invented ones into
 * a database that might be production would put a fictitious offer one status
 * change away from investors, attached to a real company's name.
 *
 * So they are written only when asked for:
 *
 *   SEED_EXAMPLE_OPPORTUNITIES=true pnpm db:seed
 *
 * and even then only as DRAFTs, which no investor can see, with titles that
 * say plainly they are examples. They exist so the Admin Portal has rows to
 * show while its screens are being built.
 *
 * Idempotent by slug, like the companies: created if missing, never altered.
 */

export interface SeedOpportunity {
  slug: string;
  /** Matches a slug in seed-companies.ts. */
  companySlug: string;
  title: string;
  summary: string;
  targetAmount: number;
  displayOrder: number;
}

export const SEED_EXAMPLE_OPPORTUNITIES_FLAG = 'SEED_EXAMPLE_OPPORTUNITIES';

export const SEED_OPPORTUNITIES: readonly SeedOpportunity[] = [
  {
    slug: 'example-residential-development',
    companySlug: 'afaq-al-manzil-properties',
    title: 'Example — Residential development raise',
    summary:
      'An example draft for building the Admin screens. Replace or cancel it before going live.',
    targetAmount: 5_000_000,
    displayOrder: 10,
  },
  {
    slug: 'example-hospitality-expansion',
    companySlug: 'hush-lush-hospitality',
    title: 'Example — Hospitality expansion',
    summary:
      'An example draft for building the Admin screens. Replace or cancel it before going live.',
    targetAmount: 2_000_000,
    displayOrder: 20,
  },
  {
    slug: 'example-service-centre-fit-out',
    companySlug: 'optimus-megatron-garage',
    title: 'Example — Service centre fit-out',
    summary:
      'An example draft for building the Admin screens. Replace or cancel it before going live.',
    targetAmount: 750_000,
    displayOrder: 30,
  },
];
