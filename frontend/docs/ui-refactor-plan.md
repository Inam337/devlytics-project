# UI refactor plan — Zentro theme, Drawer forms, DataTable listings

**Goal:** Unify the app on `components/ui`, custom teal/mint/beige palette, gradient surfaces (per screenshots), `DataTable` for all admin listings, reusable **FormDrawer** for add/edit, and `SuspenseLoading` for lazy routes/components.

**Palette**

| Token | Hex | Use |
|-------|-----|-----|
| `black-teal` | `#1A312C` | Sidebar, headings, dark text on light |
| `teal` | `#428475` | Primary buttons, links, active nav |
| `mint` | `#89D7B7` | Gradients, badges, accents |
| `beige` | `#FFF4E1` | Page background, card tint |

---

## Current state (audit)

| Area | Today | Target |
|------|--------|--------|
| Theme | Emerald `#059669` in `index.css`, `buttons.css`, `backgrounds.css` | New 4-color palette + gradients |
| Admin lists | Inline `Card` rows per page (8 pages) | `DataTable` + toolbar (search, filters) |
| Add/edit forms | Inline expand/collapse in page (`showForm`) | Side **FormDrawer** (wraps `drawer.tsx` / `sheet.tsx`) |
| Loading | `CommercePageState`, mixed spinners | `SuspenseLoading` for route/lazy; `Skeleton` inline |
| UI imports | Mix of `AppButton`, raw `<input>`, `admin-form-styles` | `components/ui` (`FormInput`, `Button`, `Badge`, etc.) |
| Drawer | Low-level `drawer.tsx` (vaul, bottom sheet) | New `FormDrawer` (right panel, like screenshot) |

**Admin pages to migrate (in order)**

1. `AdminCategoriesPage` — simplest form  
2. `AdminSuppliersPage`  
3. `AdminProductsPage` — most fields  
4. `AdminStockPage`  
5. `AdminCustomersPage`  
6. `AdminUsersPage`  
7. `AdminPurchasesPage` — line items  
8. `AdminSalesPage` — line items  

---

## Phase 1 — Theme foundation ✅

> **Done:** `index.css`, `backgrounds.css`, `buttons.css`, `text.css`, `border.css`, `SuspenseLoading`, `MainLayout`, `AppSidebar`, `AuthPageLayout`, `BrandLogo`, favicon + `index.html`. See [branding.md](./branding.md).

## Phase 1 — Theme foundation (reference)

**Files:** `src/styles/index.css`, `backgrounds.css`, `buttons.css`, `text.css`, `border.css`

**Tasks**

1. Add CSS variables in `:root`:

```css
--zentro-black-teal: #1A312C;
--zentro-teal: #428475;
--zentro-mint: #89D7B7;
--zentro-beige: #FFF4E1;
--gradient-page: linear-gradient(180deg, #FFF4E1 0%, #f5f0e8 50%, #eef5f2 100%);
--gradient-card: linear-gradient(180deg, #ffffff 0%, #f8faf9 100%);
--gradient-primary: linear-gradient(90deg, #428475 0%, #89D7B7 100%);
--gradient-primary-hover: linear-gradient(90deg, #1A312C 0%, #428475 100%);
```

2. Map to existing tokens: `--primary`, `--background`, `--sidebar`, `--color-primary`, `--color-btn-primary`, etc.

3. Add utility classes:

- `.bg-page-gradient` — main content area (screenshot 1 cards on soft gradient)  
- `.bg-card-gradient` — list row cards  
- `.btn-gradient-primary` — Apply Filters / Create buttons (screenshot 2)  

4. Update `SuspenseLoading` to use `--zentro-teal` / `--zentro-mint` instead of `--color-primary`.

**Verify:** Login + dashboard show new colors; no broken contrast on sidebar.

**Hand-off checkpoint:** You review colors in browser → approve before Phase 2.

---

## Phase 2 — Shared layout primitives ✅

> **Done:** `PageShell`, `PageToolbar`, `FilterPanel`, `ListCard`, `StatusPill`, `lazy-with-suspense.tsx`, barrel exports in `index.ts`. Pilot: `AdminCategoriesPage` uses `PageShell` + `PageToolbar`.

## Phase 2 — Shared layout primitives (reference)

**New files under `src/components/ui/`**

| Component | Purpose |
|-----------|---------|
| `PageToolbar.tsx` | Search input + Filters toggle + primary CTA (gradient btn) |
| `FilterPanel.tsx` | Collapsible filters (Role, Status, etc.) — screenshot 2 |
| `ListCard.tsx` | Optional card-row variant for commerce (screenshot 1 style) |
| `StatusPill.tsx` | Wrap/enhance `badge.tsx` with mint/teal variants |
| `PageShell.tsx` | Page title + hint + toolbar slot + children |

**Tasks**

- Export from `components/ui/index.ts` with lazy + `SuspenseLoading` wrapper pattern.
- Replace duplicated admin page headers (hint text + Add button).

**Verify:** One stub page (`AdminCategoriesPage`) uses `PageShell` only — no logic change yet.

---

## Phase 3 — FormDrawer (reusable add/edit) ✅

> **Done:** `FormDrawer.tsx`, `useFormDrawer.ts`, barrel export. Pilot: `AdminCategoriesPage` — inline form replaced with right-side sheet (bottom on mobile).

## Phase 3 — FormDrawer (reusable add/edit) (reference)

**New file:** `src/components/ui/FormDrawer.tsx`

**API (proposed)**

```tsx
<FormDrawer
  open={open}
  onOpenChange={setOpen}
  title={editingId ? 'Edit product' : 'New product'}
  description="Optional subtitle"
  onSubmit={handleSubmit}
  submitting={submitting}
  submitLabel="Save"
  cancelLabel="Cancel"
  size="md" // sm | md | lg
>
  {/* form fields — FormInput, Select, Textarea */}
</FormDrawer>
```

**Implementation notes**

- Use `sheet.tsx` (right-side panel) for desktop admin — matches user-management screenshot better than bottom `drawer.tsx`.
- Footer: gradient **Save** + flat **Cancel**; `type="submit"` on save.
- Focus trap, `aria-labelledby`, close on successful save.
- Mobile: fall back to full-width sheet or bottom drawer.

**Also create:** `src/components/admin/useFormDrawer.ts` — tiny hook: `{ open, editingId, openCreate, openEdit, close }`.

**Verify:** Wire **only** `AdminCategoriesPage` to FormDrawer; list unchanged.

---

## Phase 4 — DataTable enhancements ✅

> **Done:** `DataTable.tsx` (toolbar slot, column filters, pagination, theme, empty state), `data-table-columns.tsx` (`actionColumn`, `statusColumn`, `dateColumn`). Pilot: `AdminUsersPage` uses DataTable with column helpers.

## Phase 4 — DataTable enhancements (reference)

**File:** `src/components/ui/DataTable.tsx`

**Add (per screenshot 2)**

- [x] Top toolbar integration (or accept `toolbar` slot prop)
- [x] Column filter icon in header (optional per column)
- [x] Pagination: page numbers, "Show N entries", "Showing X to Y of Z"
- [x] Row actions column helper (`edit` / `delete` icon buttons)
- [x] Theme: header `bg-beige/teal-50`, gradient on active page button
- [x] Empty state uses palette icons

**New helper:** `src/components/ui/data-table-columns.tsx` — `actionColumn()`, `statusColumn()`, `dateColumn()`.

**Verify:** Story-style test on `AdminUsersPage` columns only (read-only).

---

## Phase 5 — Migrate admin pages (one at a time)

**Per-page checklist**

- [ ] Replace inline list with `DataTable` + column defs  
- [ ] Move form into `FormDrawer`  
- [ ] Use `PageToolbar` + `FilterPanel` where useful  
- [ ] Replace `adminInputClass` → `FormInput` / `Select` / `Textarea`  
- [ ] Replace `AppButton` → `Button` or `LoadingButton` with gradient variant  
- [ ] Delete page-local form card markup  
- [ ] Keep `CommercePageState` → split: `SuspenseLoading` page load, `DataTable` empty  

| Step | Page | Est. effort |
|------|------|-------------|
| 5.1 | Categories | Small |
| 5.2 | Suppliers | Small |
| 5.3 | Products | Medium |
| 5.4 | Stock | Medium |
| 5.5 | Customers | Medium |
| 5.6 | Users | Medium + filters |
| 5.7 | Purchases | Large (line items in drawer) |
| 5.8 | Sales | Large |

**After each page:** manual smoke test + `pnpm run verify:build`.

---

## Phase 6 — Commerce + auth UI alignment

| Area | Changes | Status |
|------|---------|--------|
| `LoginPage`, `RegisterPage`, `ForgotPasswordPage` | `AuthPageLayout` + `login-bg.png` + `logo.svg` | ✅ |
| `AppSidebar` | `BrandLogo` white wordmark / collapsed icon | ✅ |
| Favicon + `index.html` | `public/favicon.*`, title **Zentro** | ✅ |
| `ProductsPage`, `OrdersPage`, etc. | Optional `ListCard` gradient rows or compact `DataTable` | ⬜ |
| `MainLayout` / sidebar active nav | Mint/teal gradient on active item | partial |
| `HeaderProfileDropdown` | `DropdownMenu` from ui | partial |
| Form validation UI, toasts, primary `#1F150C` gradient | Per validation screenshot plan | ⬜ planned |

**Branding reference:** [branding.md](./branding.md)

---

## Phase 7 — SuspenseLoading everywhere

**Tasks**

1. `AppRoutes.tsx` — `React.lazy` each page + `<Suspense fallback={<SuspenseLoading />}>`.
2. `components/ui/index.ts` — wrap lazy exports with shared `withSuspense(Component)`.
3. `RbIcon` — keep lightweight fallback or align with `SuspenseLoading` dots.
4. Remove duplicate loaders (`CommercePageState` loading UI → `Skeleton` rows in table).

**Verify:** Throttle network in DevTools; route changes show `SuspenseLoading`.

---

## Phase 8 — Cleanup & docs

- Remove `components/admin/admin-form-styles.ts` when unused  
- Update `frontend/docs/phases/08-enhancements.md` (UI polish ✅)  
- [branding.md](./branding.md) — favicon, auth layout, sidebar logo ✅  
- Screenshot checklist in `regression.md`  
- Optional: `frontend/docs/theme.md` token reference  

---

## Suggested order (summary)

```text
Phase 1  → Theme in index.css (palette + gradients)           ✅
Phase 2  → PageShell, PageToolbar, FilterPanel, StatusPill    ✅
Phase 3  → FormDrawer + useFormDrawer hook                   ✅
Phase 4  → DataTable toolbar + pagination polish             ✅
Phase 5  → Admin pages 5.1 → 5.8 (one PR each)
Phase 6  → Commerce, auth, sidebar
Phase 7  → SuspenseLoading on routes + lazy ui
Phase 8  → Cleanup + docs
```

---

## What we do together (your hand-off points)

| After phase | You check |
|-------------|-----------|
| 1 | Colors match brand on login, sidebar, one admin page |
| 3 | Open/close drawer, save category |
| 5.1 | Categories full CRUD in new UI |
| 5.3 | Products table + drawer |
| 7 | Page navigation shows SuspenseLoading |

**Reply with:** `Start Phase 5` to migrate admin pages to DataTable + FormDrawer.
