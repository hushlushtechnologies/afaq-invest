/**
 * Afaq's own nine companies, as the marketplace first shows them.
 *
 * Kept apart from seed.ts because this is business data, not platform
 * structure: somebody will edit this list, and it should be obvious where to
 * look. The seed creates a company that is missing and then leaves it alone
 * for ever after — see the note in seed.ts about why.
 *
 * `displayOrder` runs in tens so a company can be moved between two others
 * without renumbering the rest. Afaq Al Barakha Investment is first: it owns
 * the platform.
 *
 * `legalName` is deliberately null throughout. The registered names carry
 * suffixes ("LLC", "L.L.C", "FZE") that differ per company and per emirate,
 * and inventing them would put wrong legal identities in front of investors.
 * Fill them in from Administration → Companies once you have the trade
 * licences to hand.
 */

export interface SeedCompany {
  slug: string;
  name: string;
  sector: string;
  description: string;
  website: string | null;
  isFeatured: boolean;
  displayOrder: number;
}

export const SEED_COMPANIES: readonly SeedCompany[] = [
  {
    slug: 'afaq-al-barakha-investment',
    name: 'Afaq Al Barakha Investment',
    sector: 'Investment',
    description:
      'The investment arm of the Afaq group and the company behind this platform. Brings ' +
      'investment opportunities across the group and its approved partners to investors in ' +
      'one place.',
    website: null,
    isFeatured: true,
    displayOrder: 10,
  },
  {
    slug: 'afaq-al-manzil-properties',
    name: 'Afaq Al Manzil Properties',
    sector: 'Real Estate',
    description:
      'Dubai real estate sales and property investment, covering off-plan and ready units ' +
      'for both end users and investors.',
    website: 'https://www.afaqalmanzilproperties.com/',
    isFeatured: true,
    displayOrder: 20,
  },
  {
    slug: 'afaq-al-khaleej-management-consultant',
    name: 'Afaq Al Khaleej Management & Consultant',
    sector: 'Management Consultancy',
    description:
      'Investment consultancy and brokerage, advising on structuring, feasibility and ' +
      'market entry across the group and its clients.',
    website: 'https://www.afaqmanagement.com/',
    isFeatured: true,
    displayOrder: 30,
  },
  {
    slug: 'afaq-al-manzel-interiors-design',
    name: 'Afaq Al Manzel Interiors Design',
    sector: 'Interior Design',
    description:
      'Interior design and fit-out for residential and commercial spaces, from concept ' +
      'through to handover.',
    website: null,
    isFeatured: true,
    displayOrder: 40,
  },
  {
    slug: 'hush-lush-technologies',
    name: 'Hush Lush Technologies',
    sector: 'Technology',
    description:
      'Web and software development alongside digital marketing — the team that builds and ' +
      'runs the group’s platforms, including this one.',
    website: 'https://www.hushlushtechnologies.com/',
    isFeatured: false,
    displayOrder: 50,
  },
  {
    slug: 'hush-lush-events',
    name: 'Hush Lush Events',
    sector: 'Events',
    description:
      'Wedding and corporate event styling and production, from concept design to on-the-day ' +
      'delivery.',
    website: 'https://www.hushlushevents.com/',
    isFeatured: false,
    displayOrder: 60,
  },
  {
    slug: 'hush-lush-hospitality',
    name: 'Hush Lush Hospitality',
    sector: 'Hospitality & Trading',
    description:
      'Bulk supply of hospitality products to hotels and venues — linen, kitchen equipment ' +
      'and in-room essentials — with general trading alongside.',
    website: null,
    isFeatured: false,
    displayOrder: 70,
  },
  {
    slug: 'optimus-megatron-cars',
    name: 'Optimus Megatron Cars',
    sector: 'Automotive',
    description:
      'Pre-owned luxury car dealership, sourcing and selling premium vehicles in the UAE ' +
      'market.',
    website: 'https://www.optimusmegatroncars.com/',
    isFeatured: false,
    displayOrder: 80,
  },
  {
    slug: 'optimus-megatron-garage',
    name: 'Optimus Megatron Garage',
    sector: 'Automotive Services',
    description:
      'Detailing, tuning and car care — the workshop side of the automotive business, ' +
      'serving both the dealership and retail customers.',
    website: 'https://www.optimusmegatroncarsgarage.com/',
    isFeatured: false,
    displayOrder: 90,
  },
];
