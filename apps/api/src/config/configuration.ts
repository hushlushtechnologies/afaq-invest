export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  secretKey: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  databaseUrl: string;
  /** Where the Admin Portal runs — used to build invitation and reset links. */
  adminAppUrl: string;
  supabase: SupabaseConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  adminAppUrl: process.env.ADMIN_APP_URL ?? 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
    secretKey: process.env.SUPABASE_SECRET_KEY ?? '',
  },
});
