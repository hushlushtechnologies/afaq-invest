export type AppEnvironment = 'development' | 'staging' | 'production';

export interface PublicEnv {
  apiUrl: string;
  environment: AppEnvironment;
}

export function getPublicEnv(): PublicEnv {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error('Missing NEXT_PUBLIC_API_URL. Check .env.local against .env.example');
  }

  const environment = (process.env.NEXT_PUBLIC_APP_ENV ?? 'development') as AppEnvironment;

  return { apiUrl, environment };
}
