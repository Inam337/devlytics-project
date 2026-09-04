# Zentro frontend

React + Vite + Tailwind + Zustand.

## Quick start (Phase 0)

1. Start the API — see [../docs/dev-setup.md](../docs/dev-setup.md).
2. Copy env if needed: `.env.example` → `.env.development` (already committed for local dev).
3. Run:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

**API URL:** `VITE_API_BASE_URL=http://localhost:3000` (no `/api/v1` prefix).

**Phase 1:** HTTP client (`src/libs/axios.ts`), tokens (`src/libs/auth-tokens.ts`), API paths (`AppConstants.ApiUrls` / `ApiUrlBuilders`).

## Branding & assets

| Item | Location |
|------|----------|
| Favicon | `public/favicon.svg`, `public/favicon.png` |
| App title | `index.html` → **Zentro** |
| Asset barrel | `src/assets/index.ts` — `loginBg`, `logoColor`, `logoWhite`, `brandIcon` |
| Auth layout | `AuthPageLayout` — login/register/forgot password |
| Sidebar logo | `BrandLogo` in `AppSidebar` |

Full guide: [../docs/branding.md](../docs/branding.md)

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm run verify:build` | Production build + API URL check |

## Docs

- [**Full project context**](../docs/project.md)
- [Dev setup (Phase 0)](../docs/dev-setup.md)
- [Integration plan](../docs/architecture.md)
- [Branding (favicon, auth, sidebar)](../docs/branding.md)
- [UI refactor plan](../docs/ui-refactor-plan.md)
- [Mock users & seed data](../docs/data.md)
