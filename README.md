# Afaq Invest

Investment management platform for **Afaq Al Barakha Investment**, part of the
Afaq ecosystem of nine companies. Three portals — Admin, Investor and Partner —
share one API and one database.

> Status: **Sprint 1 — foundation.** No business features yet.

## Stack

| Layer | Technology |
| --- | --- |
| Monorepo | pnpm workspaces, Turborepo |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS v4 |
| UI libraries | Framer Motion, lottie-react, Lucide, clsx, tailwind-merge |
| Forms and data | React Hook Form, Zod, TanStack Query, TanStack Table |
| Theme and language | next-themes, next-intl (English, Arabic, RTL) |
| API | NestJS 12 (ES modules), Swagger, class-validator |
| Database | Supabase PostgreSQL, Prisma 7 |
| Auth and storage | Supabase |
| Hosting | Vercel (frontends), Railway (API) |

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 24 LTS |
| pnpm | 12 |
| Git | 2.40+ |

## First-time setup

See **[docs/WINDOWS-SETUP.md](docs/WINDOWS-SETUP.md)** for step-by-step Windows
instructions. Short version, from the project root:

```bash
pnpm install
pnpm build
pnpm dev
```

`pnpm build` must run once before `pnpm dev` works fully, because the shared
packages compile to `dist/` folders that the apps read. After that, `pnpm dev`
rebuilds them automatically.

## Local URLs

| Application | URL |
| --- | --- |
| Admin | http://localhost:3000 |
| Investor | http://localhost:3001 |
| Partner | http://localhost:3002 |
| API | http://localhost:4000/api/v1 |
| API health | http://localhost:4000/api/v1/health |
| Swagger | http://localhost:4000/docs |

Frontend routes are locale-prefixed: `/en/dashboard`, `/ar/dashboard`.

## Commands (run from the project root)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start all four apps |
| `pnpm build` | Build everything |
| `pnpm build:packages` | Build only the shared packages |
| `pnpm lint` | Lint everything |
| `pnpm typecheck` | Type-check everything |
| `pnpm format` | Format all files |
| `pnpm clean` | Delete build output (works on Windows) |
| `pnpm --filter @afaq/admin dev` | Start one app only |

Database commands, run from `packages/database`:

| Command | What it does |
| --- | --- |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm db:status` | Show migration status |
| `pnpm db:studio` | Open the database browser |

## Structure

```
afaq-invests/
├── apps/
│   ├── admin/        Admin portal     (Next.js, port 3000)
│   ├── investor/     Investor portal  (Next.js, port 3001)
│   ├── partner/      Partner portal   (Next.js, port 3002)
│   └── api/          REST API         (NestJS,  port 4000)
├── packages/
│   ├── ui/           Shared React components
│   ├── types/        Shared TypeScript types
│   ├── validation/   Shared Zod schemas
│   ├── api-client/   Typed API client
│   ├── database/     Prisma schema, migrations, client
│   ├── config/       Shared TypeScript settings
│   └── utils/        Shared helpers
├── scripts/          Cross-platform helper scripts
└── docs/             Setup, environment and deployment guides
```

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Production |
| `develop` | Integration (default) |
| `sprint-XX-*` | Active sprint work |

## Security

- Never commit `.env.local` or `packages/database/.env`
- Only `NEXT_PUBLIC_*` variables may reach the browser
- The Supabase secret key belongs to the API only
