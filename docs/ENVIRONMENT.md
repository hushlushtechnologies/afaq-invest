# Environment configuration

## Files

| File | Committed | Contains |
| --- | --- | --- |
| `.env.example` (root) | Yes | Reference of every variable, no real values |
| `apps/*/.env.example` | Yes | Per-app templates |
| `packages/database/.env.example` | Yes | Prisma CLI template |
| `apps/admin/.env.local` | **No** | Public values |
| `apps/investor/.env.local` | **No** | Public values |
| `apps/partner/.env.local` | **No** | Public values |
| `apps/api/.env.local` | **No** | Secrets |
| `packages/database/.env` | **No** | Database URLs |

## Public vs private

Any variable starting with `NEXT_PUBLIC_` is compiled into browser JavaScript
and can be read by every visitor. Only the Supabase **publishable** key, the
project URL and the API URL belong there.

The Supabase **secret** key bypasses Row Level Security and has full access to
all data. It exists only in `apps/api/.env.local` and in Railway. It must never
appear in a `NEXT_PUBLIC_` variable, in frontend code, or in Git.

## Database URLs

| Variable | Port | Used by |
| --- | --- | --- |
| `DATABASE_URL` | 6543 | The running API, through Supabase's connection pooler |
| `DIRECT_URL` | 5432 | Prisma migrations and Prisma Studio |

Migrations cannot run through the pooler, which is why both exist.
With Prisma 7, `DIRECT_URL` is read by `packages/database/prisma.config.ts`,
not by `schema.prisma`.

## Environments

| Environment | Where values live |
| --- | --- |
| Local | `.env.local` files on the developer machine |
| Staging | Vercel and Railway dashboards |
| Production | Vercel and Railway dashboards |

## Rotating a leaked secret key

1. Supabase Dashboard → Settings → API Keys
2. Create a new secret key
3. Update `apps/api/.env.local` and Railway
4. Delete the old key (cannot be undone — do step 3 first)
