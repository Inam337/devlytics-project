# Zentro frontend documentation

Index for all docs under `frontend/docs/`.

**Full project context (start here):** [**project.md**](./project.md) — product summary, stack, architecture, domains, status, conventions.

---

## Implementation phases (context by phase)

**Start here for what was built and how to verify each phase:**

| Doc | Description |
|-----|-------------|
| [**phases/README.md**](./phases/README.md) | Phase index + quick verification |
| [phases/00-prerequisites.md](./phases/00-prerequisites.md) | Phase 0 — local dev, CORS |
| [phases/01-http-foundation.md](./phases/01-http-foundation.md) | Phase 1 — axios, env, API paths |
| [phases/02-authentication.md](./phases/02-authentication.md) | Phase 2 — login, register, refresh |
| [phases/03-api-layer.md](./phases/03-api-layer.md) | Phase 3 — models + services |
| [phases/04-commerce.md](./phases/04-commerce.md) | Phase 4 — storefront flows |
| [phases/05-admin.md](./phases/05-admin.md) | Phase 5 — admin CRUD |
| [phases/06-routing.md](./phases/06-routing.md) | Phase 6 — routes + navigation |
| [phases/07-production.md](./phases/07-production.md) | Phase 7 — build + regression + CI |
| [phases/08-enhancements.md](./phases/08-enhancements.md) | Phase 8 — optional (i18n done) |

**Master plan (all user stories):** [architecture.md](./architecture.md)

---

## Runbooks

| Doc | Use when |
|-----|----------|
| [**project.md**](./project.md) | Full product + technical context |
| [dev-setup.md](./dev-setup.md) | First-time local setup (Phase 0) |
| [seed.md](./seed.md) | Demo database + verify seed |
| [routes.md](./routes.md) | URL map and role visibility |
| [production.md](./production.md) | Deploy / production env |
| [regression.md](./regression.md) | Manual + automated QA checklist |
| [data.md](./data.md) | Demo users quick reference |
| [**branding.md**](./branding.md) | Favicon, logos, auth layout, sidebar (Sprints A–C ✅) |
| [ui-refactor-plan.md](./ui-refactor-plan.md) | Theme, DataTable, FormDrawer migration |

---

## Backend docs

| Doc | Path |
|-----|------|
| **Full project context** | [`backend/docs/project.md`](../../backend/docs/project.md) |
| API reference | `backend/myapp/docs/api-reference.md` |
| Backend architecture | `backend/myapp/docs/backend-architecture.md` |
| Demo data (API) | `backend/myapp/docs/data.md` |

---

## Status at a glance

```text
Phases 0–7  ✅ Complete
Seed        ✅ Complete — pnpm run seed:demo
Branding    ✅ Sprints A–C — favicon, sidebar logo, auth layout (see branding.md)
Phase 8     🟡 Partial — i18n (US-8.10) ✅; rest optional
UI refactor 🟡 Phases 1–4 ✅; admin migration + polish in progress (ui-refactor-plan.md)
```
