# Phase 2 — Authentication and session

**Status:** ✅ Complete  
**Goal:** Login, register, refresh, change password, route guards — aligned with NestJS auth JSON.

---

## Context

Auth UI lives under `src/pages/accounts/` with Zod validation in `src/validation-schemas/`. Backend returns `{ success, user, token, refreshToken }` on login/register. Axios silently refreshes on 401 when a valid refresh token exists.

---

## User stories

### US-2.1 — Login end-to-end

- [x] Valid credentials → `/dashboard`; invalid → inline error
- [x] Request URL: `{VITE_API_BASE_URL}/auth/login`
- [x] `PrivateRoutes` and axios share the same token

### US-2.2 — Registration

- [x] `POST /auth/register` with `skipAuth`
- [x] Success returns tokens and auto sign-in → dashboard

### US-2.3 — Refresh token flow

- [x] `refreshToken` stored on login/register
- [x] `POST /auth/refresh-token` on 401; retry once; else logout

### US-2.4 — Change password (profile)

- [x] `POST /auth/change-password` from Profile page
- [x] Success and validation errors surfaced in UI

### US-2.5 — Route guards and logout

- [x] Logout clears persistence; `/dashboard` without token → login
- [x] Public routes redirect authenticated users away from login/register

---

## Key files

| File | Role |
|------|------|
| `src/components/layouts/AuthPageLayout.tsx` | Auth shell: `login-bg.png`, color logo, language switcher |
| `src/pages/accounts/AuthFormLayout.tsx` | White form card (title, fields, footer) |
| `src/pages/accounts/LoginPage.tsx` | Login form |
| `src/pages/accounts/RegisterPage.tsx` | Register form |
| `src/pages/accounts/ForgotPasswordPage.tsx` | Placeholder reset flow |
| `src/pages/Profile.tsx` | Change password |
| `src/components/ui/BrandLogo.tsx` | Sidebar + auth logo (`variant`, `collapsed`) |
| `src/assets/index.ts` | Barrel: `loginBg`, `logoColor`, `logoWhite`, `brandIcon` |
| `src/services/auth.ts` | Auth API calls |
| `src/stores/auth.ts` | Session state (Zustand persist) |
| `src/validation-schemas/` | Zod schemas + `TranslationFunction` |
| `src/hooks/use-auth-translation.ts` | i18n for auth forms |
| `src/routes/PrivateRoutes.tsx` | JWT guard |
| `src/routes/PublicRoutes.tsx` | Guest-only guard |

**Branding:** See [branding.md](../branding.md) for favicon, `index.html`, and layout structure.

---

## Backend contract (login)

```json
{
  "success": true,
  "message": "Login successful",
  "user": { "id": 1, "email": "...", "name": "...", "role": "user", "status": true },
  "token": "<accessToken>",
  "refreshToken": "<refreshToken>"
}
```

---

## Demo users

| Email | Role | Password |
|-------|------|----------|
| `shopper@zentro.demo` | `user` | `ShopDemo123!` |
| `admin@zentro.demo` | `admin` | `ShopDemo123!` |

See [seed.md](../seed.md).

---

## Verify

```bash
cd frontend/myapp
pnpm run verify:auth    # if available
pnpm run verify:regression  # includes login + refresh
```

Manual: login → reload page → still authenticated → logout → blocked from `/dashboard`.

---

## Next phase

→ [03-api-layer.md](./03-api-layer.md)
