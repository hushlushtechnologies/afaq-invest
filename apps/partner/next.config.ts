import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@afaq/ui',
    '@afaq/utils',
    '@afaq/types',
    '@afaq/validation',
    '@afaq/api-client',
  ],
};

export default withNextIntl(nextConfig);
