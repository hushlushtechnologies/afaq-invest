# Windows setup

All commands run in **PowerShell**, from the project root unless stated.

## 1. Tools

```powershell
node -v      # needs v24.x
pnpm -v      # needs 12.x
git --version
```

If pnpm is older: `npm install -g pnpm@12`

## 2. Install dependencies

```powershell
pnpm install
```

## 3. Environment files

```powershell
Copy-Item apps\admin\.env.example apps\admin\.env.local
Copy-Item apps\investor\.env.example apps\investor\.env.local
Copy-Item apps\partner\.env.example apps\partner\.env.local
Copy-Item apps\api\.env.example apps\api\.env.local
Copy-Item packages\database\.env.example packages\database\.env
```

Fill in real values from the Supabase dashboard. See `docs/ENVIRONMENT.md`.

## 4. Database

```powershell
cd packages\database
pnpm exec prisma generate
pnpm exec prisma migrate status
cd ..\..
```

## 5. Build once, then run

```powershell
pnpm build
pnpm dev
```

## Troubleshooting

**"Cannot find module '@afaq/…'"** — the shared packages are not built.
Run `pnpm build:packages`, then in VS Code: `Ctrl+Shift+P` →
*TypeScript: Restart TS Server*.

**`ERR_PNPM_IGNORED_BUILDS`** — a new dependency wants to run an install script.
Add it to `allowBuilds` in `pnpm-workspace.yaml` (`false` unless it truly needs
to build), then run `pnpm install` again.

**Port already in use** — find the process with
`Get-NetTCPConnection -LocalPort 3000` and stop it, or close the other terminal.
