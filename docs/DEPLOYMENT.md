# Deployment

| Application | Platform | Root directory |
| --- | --- | --- |
| Admin | Vercel | `apps/admin` |
| Investor | Vercel | `apps/investor` |
| Partner | Vercel | `apps/partner` |
| API | Railway | repository root |

## Vercel (one project per frontend)

Set **Root Directory** to the app folder. Build and install commands come from
that app's `vercel.json`, which runs pnpm and Turborepo from the repository root
so the shared packages build first.

Environment variables (identical for all three):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL` — the Railway URL plus `/api/v1`

Never add the Supabase secret key to Vercel.

## Railway (API)

Deploys from the repository root using `railway.json`. The start command applies
pending Prisma migrations (`migrate deploy`), then starts the API.

Environment variables: `NODE_ENV=production`, `API_PREFIX`, `CORS_ORIGINS`,
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`DATABASE_URL`, `DIRECT_URL`. Do **not** set `PORT` — Railway provides it.

`NODE_ENV=production` also disables Swagger at `/docs`.
