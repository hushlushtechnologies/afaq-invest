import { getPublicEnv, type AppEnvironment } from '@/lib/env';

/**
 * Small facts about this build, shown in the sidebar footer. The version helps
 * support: "which version are you on?" is the first question on any bug report.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

export function getEnvironment(): AppEnvironment {
  return getPublicEnv().environment;
}

/** Production is the normal case and needs no badge; the others do. */
export function showsEnvironmentBadge(environment: AppEnvironment): boolean {
  return environment !== 'production';
}
