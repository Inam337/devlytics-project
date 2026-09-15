# Handoff: Devlytics — Developer & Engineering Intelligence Platform

## Overview

Devlytics is an engineering intelligence platform. It connects read-only to GitHub and
GitLab, measures code quality and delivery through static analysis, scores and ranks
developers and teams on that measured evidence, tells each developer the specific thing
to fix, and then proves whether the fix worked by re-running the same analysis.

This bundle is the complete design: authentication, a seven-step organization setup,
thirty-plus application screens including the **Improvement Engine**, a state library, a
UI control library, marketing pages, and sixteen email templates.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing
intended look and behaviour, not production code to copy directly.

The task is to **recreate these designs in the target codebase's existing environment**
(React, Vue, Svelte, native, whatever is already in place) using its established
patterns, component library and conventions. If no environment exists yet, choose the
most appropriate framework for the project and implement the designs there.

The source `.dc.html` files use a lightweight in-house template runtime (`support.js`,
`<sc-if>`, `<sc-for>`, `{{ }}` holes). **Do not port that runtime.** Read it as a
description of conditional rendering and iteration, then express the same logic in the
target framework's idioms.

All styling is inline. That is a constraint of the prototyping environment, not a
recommendation — extract it into the target codebase's styling system.

**`standalone/` contains self-contained single-file versions.** Every asset, font and
script is inlined; each opens offline in a browser with no server. Use these to explore
the designs. Use the `.dc.html` sources when you need to read the underlying logic.

---

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, shadows and interaction states
are final and measured. Every text colour was verified at 4.5:1 or better against its own
background. Recreate pixel-accurately using the codebase's existing primitives.

The data is representative sample data (DPL Engineering, 128 developers, 24
repositories). Replace it with real API responses; keep the shapes.

---

## Files

### Standalone — open these first

| File | Contains |
| --- | --- |
| `standalone/Devlytics-App.html` | The whole application |
| `standalone/Devlytics-States-and-Emails.html` | Every state + 16 email templates |
| `standalone/Devlytics-Controls.html` | UI control library |
| `standalone/Devlytics-Sync-Flow.html` | Provider sync pipeline walkthrough |
| `standalone/Devlytics-Landing.html` | Marketing site |
| `standalone/Devlytics-Promo-Kit.html` | Campaign page + social copy |
| `standalone/Devlytics-Palette.html` | Colour system with live contrast maths |

### Source and reference

| File | Contains |
| --- | --- |
| `Devlytics.dc.html` | Application source — all screens, modals, drawers |
| `Devlytics States.dc.html` | States and email source |
| `Devlytics Controls.dc.html` | Control library source |
| `Devlytics Sync Flow.dc.html` | Sync pipeline source |
| `Devlytics Landing.dc.html` | Marketing source |
| `Devlytics Promo Kit.dc.html` | Promo source |
| `Devlytics Palette.dc.html` | Palette source |
| `DEVLYTICS-SPEC.md` | Backend spec — domain model, scoring engine, endpoints, rules |
| `support.js` | Prototype runtime. Reference only — do not port |
| `assets/` | Logo marks, wordmarks, app icon |

Read `DEVLYTICS-SPEC.md` for domain logic, then this README for UI.

---

## Product rules that drive the UI

These are not decoration. Each shows up as a visible constraint and must survive
implementation.

1. **Lines of code carry zero scoring weight.** LOC appears in KPI tiles and charts but
   always renders in muted ink `#5C6879` and reads "activity metric". Never in improvement
   green, never as a positive delta.
2. **Static analysis produces evidence; AI only interprets it.** Findings render three
   visually distinct blocks: Observed fact (green), AI inference (violet, with a confidence
   score), Recommendation (siphon). Never merge them.
3. **Goals and experiments complete only by re-analysis.** There is no "mark complete"
   control anywhere in the product.
4. **Scoring weights must total exactly 100%.** The save button is blocked and a red
   inline error shows when they do not.
5. **Failures freeze, they never drift.** Stale values render at full opacity with an
   explicit "frozen at <timestamp>" note — never greyed out or zeroed.
6. **Correlation is never labelled cause.** Cause analysis is headed "Likely contributing
   factors" and carries the note "Inference — not proven causality".

---

## Screens

### Auth

**Login** — two-column, 50/50.
- Left: white, centered column max-width 400px. Logo lockup, "Welcome back" at
  `600 32px/1.15`, subhead `15px #6E7480`. Email and password fields, primary button,
  OR divider, GitHub and Google buttons side by side, forgot-password / create-account row.
- Right: gradient `linear-gradient(160deg,#0B7D9E 0%,#2E6E8E 46%,#372b73 100%)`. Eyebrow
  in mono uppercase `.12em`, headline `600 26px/1.3` white, four stat cards in a 2×2 grid
  at `rgba(255,255,255,.11)` with `.22` borders.

**Register** — same split, multi-step form on the left.

**Onboarding wizard** — left rail 280px listing seven steps with numbered circles
(completed shows a check on `#E3FBEE`, current is solid violet, pending is a grey
outline). Right pane holds step content: organization info, department, team (avatar
picker + colour swatches), invite developers (repeatable rows), connect provider (two
selectable cards with scope chips), import repositories (multi-select with select-all),
complete (summary with green checks). Footer: Back, Continue, right-aligned "Skip setup".

---

### Application shell

**Header** — 60px, white, bottom border `#E2E8F0`.
Left: 22px logo mark + wordmark, then the organization switcher (240px dropdown panel).
Center: search input max-width 420px with live results grouped by entity type.
Right, in order: date-range chip ("Last 30 days"), notification bell with a `#B4192F`
count badge and a 330px dropdown, avatar with a 210px user menu.

**Sidebar** — 236px expanded, 58px collapsed, gradient
`linear-gradient(180deg,#0B7D9E 0%,#2E6E8E 34%,#372b73 100%)`.

Nested navigation with three visually distinct states — this distinction was iterated on
specifically and matters:

| State | Treatment |
| --- | --- |
| Active leaf or active child | Solid white pill, violet `#372b73` ink, `0 4px 14px rgba(12,8,36,.26)` shadow |
| Parent owning the active child, expanded | No fill. Full white label. Full-height 3px rail at `rgba(255,255,255,.5)`. Chevron rotated 180° |
| Parent owning the active child, collapsed | `rgba(255,255,255,.14)` fill, 18px solid white rail |
| Hover, inactive | `rgba(255,255,255,.12)` wash, label to full white, `translateX(2px)`, 160ms ease |
| Hover, active | Brightens toward its own fill only |

Inactive labels sit at 72–90% opacity so the hover lift is visible. Rails are separate
absolutely-positioned elements, **not `inset` box-shadows** — an inset shadow is clipped
by the row's 10px radius and renders as a crescent.

Collapsed, clicking a parent opens a flyout panel to the right listing its children;
selecting a child closes it.

**Nav groups** — Dashboard · Leaderboards (Developers, Teams) · Organization (Developers,
Teams, Projects, Repositories) · Code Quality (Quality Overview, Improvement Center,
Goals) · **Improvement Engine** (Overview, Problems, Recommendations, Experiments, Proof,
History) · Analytics (Engineering, AI Analytics, Achievements) · Reports · Integrations ·
Settings.

**Content pane** — `flex:1; min-width:0; overflow:auto; padding:28px 32px 60px`.

> Implementation warning: in the prototype a single missing `</div>` in the dashboard
> block once nested every other screen inside it, making them all render blank. Assert
> that route views are siblings, not accidental descendants.

**Full-screen loader** — on every route change, a fixed overlay covers the viewport:
`rgba(246,247,251,.82)` with `backdrop-filter: blur(3px)`. Centered: a 104px gradient
progress ring spinning 1.5s linear, the octopus mark inline as SVG (58×61, violet→siphon
gradient) bobbing 7px on a 1.8s ease-in-out cycle, tentacles swaying ±3.5° in staggered
pairs, eyes blinking every 4s, and a pulsing radial halo. Below: route-aware title
("Ranking developers", "Reading analysis run #418") over the fixed subline "Reading
measured evidence, not cached values".

---

### Dashboard

Header row with title and a right-aligned Export button (52px gap below it). Filter chip
row: date range, department, team, project, repository.

**Nine KPI tiles** — `repeat(auto-fit, minmax(148px,1fr))`, gap 12px. White card, 1px
`#E2E8F0`, 12px radius, 15px padding. Mono uppercase label at 10px `.09em`, value at
`600 23px` mono, delta at 11px mono in improvement green — except lines of code, which
reads "activity metric" in muted `#5C6879`.

Each tile carries a 32px gradient icon tile at 10px radius. Gradients stay in the cool
violet/teal family: `#372b73→#5b3f9e`, `#5b3f9e→#2E6E8E`, `#2E6E8E→#0B7D9E`,
`#372b73→#0B7D9E`, `#5b3f9e→#0B7D9E`, `#0B7D9E→#5b3f9e`.

**Two-column region** (`auto-fit minmax(340px,1fr)`, `align-items:stretch` so heights match):
- Left: Top Developers — three-place podium then a top-5 table
- Right: Top Teams list, and Recent Activity which flexes to fill remaining height

**Podium** — 1st violet `#372b73` / 132px plinth, 2nd peacock `#2E6E8E` / 104px, 3rd
lilac `#5b3f9e` / 84px. Avatar circle, name, team, score, medal emoji above. Plinths are
`rgba(colour,.26→.08)` vertical gradients with matching borders.

Then: engineering activity grouped bars, code quality donut with severity bars, ranking
trend line, AI analytics distribution.

---

### Leaderboards

**Developer** — podium card, then a sortable table in a horizontal scroller with
`min-width:880px` so fixed columns keep their size: rank, developer (avatar + name +
role), team, score, quality, delivery, reviews, testing, trend. Headers are clickable
with a `⇅` affordance; the active sort column is violet.

**Team** — same pattern at `min-width:900px`: rank, team (tile + name + code), score,
members, projects, repos, quality, testing, trend.

Ranks 1–3 use medal emoji; 4+ use `#N` in muted ink. Trend renders `▲ n` green, `▼ n`
red, `– 0` muted.

---

### Developer profile and comparison

**Profile** — header card with 84px avatar, name `600 24px/1.1`, role, team chip, rank
chip, right-aligned score `600 40px` mono, Compare and Export buttons. Ten underline tabs,
horizontally scrollable: Overview, Activity, Code Quality, Reviews, Testing, Reliability,
Projects, Repositories, Ranking History, Achievements. Overview holds a six-bar score
breakdown, activity KPI grid, ranking sparkline, achievement chips.

**Comparison** — reached from Compare. Two dropdown slots either side of a "vs" divider,
two joined score cards sharing a hairline, then seven category rows each a
`60px 1fr 60px` grid with mirrored bars growing from the centre. The leading side renders
green and gradient-filled, the trailing side muted. Closes with a plain-language summary.

---

### Teams, Projects, Repositories

**Teams** — card grid with a 46px colour tile, name, code, medal, three-up
members/repos/score row. Create-team wizard is a three-step modal (information → avatar
and colour → member selection).

**Team profile** — 96px tile header, nine tabs, performance breakdown, member roster,
ranking history.

**Projects** — card grid with status pill (`Active` green, `At Risk` amber), team, member
and repo counts, progress bar, score. Project detail lists quality KPIs and in-scope
repositories.

**Repositories** — table in a scroller at `min-width:940px`: provider chip, name (mono),
project, team, commits, quality, coverage, last sync (colour-coded by state, `nowrap`).
Detail view adds KPIs, coverage trend, top contributors, manual sync.

---

### Code Quality

**Quality Overview** — eight KPI cards at `auto-fit minmax(196px,1fr)` (a fixed
four-column grid clipped the last card), quality and coverage trends, issues by severity
(Blocker / Critical / Major / Minor), quality by repository.

**Improvement Center** — findings list; each detail opens a right drawer with the
three-block structure: Observed fact on `#F1FBF5`, AI inference on `#F8F5FD` with a
confidence score, Recommendation on `#EFF8FB`. Footer converts the finding to a goal.

**Goals** — KPI tiles computed from the goal list (never hard-coded), then goal cards with
baseline, target, current, progress bar and state (`On track` / `At risk` / `Completed`).

---

### Improvement Engine

The differentiating feature. Eight-stage loop: MEASURE → DETECT → EXPLAIN → RECOMMEND →
GOAL → EXPERIMENT → RE-MEASURE → PROVE.

**Overview** — header with "+ Create improvement experiment" and "View recommendations".
Four KPI tiles (active improvements, problems detected, improvements proven, improvement
rate). Then the lifecycle strip: eight clickable stages in a
`auto-fit minmax(112px,1fr)` grid, each with a progress bar, a status circle (`✓`
completed on `#F1EDFA`, `●` current solid violet, `○` pending grey outline), a mono
uppercase label and a meta line. Clicking a stage swaps the explanation panel below, which
sits on `#FBFCFD` and bleeds to the card edges. Below: top problems, active experiments
with live progress bars, and a "What improved" panel.

**Problems** — one card per problem, left border 3px in the severity colour. Each shows
title, ID, scope, a severity pill, then a three-up Current / Previous / Change grid, the
detection window, confidence, and a "Why this matters" panel. Three actions: View
evidence, Analyze cause, Create improvement.

**Cause analysis** — opens from Analyze cause. A green "Observed fact" block states the
measurement. Below, "Likely contributing factors" carries the note "Inference — not proven
causality" and lists each signal as a `minmax(140px,1.1fr) minmax(90px,1fr) 72px 84px`
row: name, correlation bar (gradient for High, lilac Medium, grey Low), value, confidence
pill, with the evidence sentence underneath. Related recommendations follow.

**Recommendations** — per card: ID, state pill (Open / Experiment running / Dismissed),
title, reason, and three stat boxes (confidence, effort, moves). Footer shows the
supporting-signal count and source problem, with View evidence and a state-dependent CTA.
Dismissed cards drop to 0.72 opacity with muted title ink.

**Experiments** — card grid at `minmax(380px,1fr)`. Each: ID, title, status pill, owner
avatar and period, then a primary-metric block showing `base → now` with a progress bar
and "% to target", and the hypothesis underneath.

**Experiment detail** — hypothesis (violet block) and intervention (siphon block) side by
side. Live progress: primary metric at `600 34px` mono with a gradient bar and a
sparkline, then secondary metric cards at `auto-fit minmax(176px,1fr)`. Before/after table
in a scroller at `min-width:520px` with a 7/30/90/Custom window switcher.

Two terminal states:
- **Target achieved** — `#F1FBF5` panel, green check tile, base → final line, supporting
  signals as checked list, and an improvement-confidence block explaining *why* the
  confidence is high.
- **Improvement not achieved** — `#FDF4F3` panel, red cross tile, then three columns:
  What changed / What did not change / Which assumption failed. Actions: Create new
  experiment, Analyze failure, Archive.

**Proof** — cards with a green "Improvement proven" header strip, problem and intervention
boxes, `base → final` with the improvement figure, then target, confidence, signal count
and duration. Actions: View evidence, View experiment, Share result.

**History** — table in a scroller at `min-width:940px`: period, problem, intervention,
owner, metric, baseline, final, result. Statuses Active / Proven / Failed / Cancelled.
Failed and cancelled rows are kept deliberately.

**Create-experiment wizard** — 760px modal, seven steps with a segmented progress bar:
select problem (radio cards) → define hypothesis (textarea + a note that a hypothesis must
name one primary metric) → define target (baseline locked and labelled "locked from
analysis run #418") → select metrics (primary fixed, secondary toggleable) → define period
(with a note on how many analysis runs it covers) → define intervention (radio cards with
detail lines) → review (key/value summary).

**Evidence drawer** — 440px right drawer used from problems, recommendations, experiments
and proofs. Blocks labelled FACT / SUPPORTING SIGNALS / INFERENCE / RECOMMENDATION /
RESULT, each colour-coded with a 3px left border. Closes with a "Why am I seeing this?"
provenance block: data source, metrics used, time period, analysis run, AI provider,
generated timestamp. No chain-of-thought is ever exposed.

---

### Analytics, AI Analytics, Achievements

**Analytics** — six chart cards, each a deliberately different presentation so they are
distinguishable at a glance: line, area, grouped bar, histogram, horizontal bar, donut.
The histogram normalizes against its own bin maximum. Grouped bars use three separable
series: violet `#372b73`, siphon `#0B7D9E`, lilac `#8a6fc4`.

**AI Analytics** — adoption KPIs, tool distribution, adoption by team, and a prominent
amber panel stating AI usage is excluded from scoring.

**Achievements** — summary header with a gradient completion ring (4 of 10) and Earned /
In progress / Locked counts. Badges grouped under labelled dividers. Each card is
horizontal: 46px glyph tile (gradient earned, violet tint in progress, grey locked), name,
state chip, evidence line ("41 of 55 bugs resolved"), progress bar only where progress
applies. Line-art SVG glyphs, no emoji.

---

### Reports, Integrations, Settings

**Reports** — seven report types in a left list, scope controls, live preview, Export PDF
and Export CSV.

**Integrations** — provider cards (state dot, repo count, last sync, actions), AI tool
telemetry list, and the connect flow: authorize with scope disclosure → select
organization → select repositories → live sync with per-task checkmarks → done.

**Settings** — 212px left tab rail, thirteen sections. Fully designed: Scoring Rules
(weight editor with the 100% constraint and a blocking red error), Branding (fields plus a
live preview strip), Users (six role cards with permission scopes plus a user table),
Departments, Notifications (event × channel toggle matrix), Audit Logs.

**Audit log detail drawer** — clicking a log row opens a 420px right drawer: category chip
with status glyph, change summary, metadata block (actor / time / IP), a "What happened"
panel, side-by-side Before and After value tables, and a "Why" panel on `#EAF4F8`.

---

## Interactions & Behavior

**Navigation** — every route change sets a loading flag, shows the full-screen loader, and
clears after the skeleton delay (default 420ms, adjustable). Navigation also clears all
chrome state: dropdowns, modals, nav flyout, wizard, evidence drawer.

**Dropdowns** — organization switcher, notifications, user menu and search results are
mutually exclusive; opening one closes the others. Clicks inside a panel call
`stopPropagation` so panel chrome does not dismiss it.

**Modals** — create team (3-step), create goal, invite developer, create experiment
(7-step). Scrim `rgba(38,42,50,.42)`, card 14–16px radius,
`0 30px 70px rgba(20,14,45,.3)`, `floatUp .2s` entry. Click-outside and × both close.

**Drawers** — finding, audit and evidence. Right-anchored, 380–440px,
`-20px 0 60px rgba(20,14,45,.2)`.

**Toasts** — bottom-right, 3px left border in the semantic colour, auto-dismiss 4.2s.

**Tables** — sortable headers, row hover `#F8FAFC`, selectable rows with a header
select-all reflecting indeterminate state, bulk-action footer showing the count.

**Animations**

| Name | Definition | Used for |
| --- | --- | --- |
| `spin` | `rotate(360deg)`, 1.5s linear | Loader ring, inline spinners |
| `bobLoader` | `translateY(0 → -7px → 0)`, 1.8s ease-in-out | Loader octopus |
| `tl` / `tr` | `rotate(∓3.5deg)`, 2.6s staggered | Loader tentacles |
| `tc` | `translateY(2.5px)`, 2.6s | Centre tentacle |
| `blinkEye` | `scaleY(1 → .12)` at 96%, 4s | Loader eyes |
| `pulseRing` | `scale(.9→1.08)` + opacity `.45→.9`, 1.8s | Loader halo |
| `shimmer` | opacity `.55→1`, 1.1s | Skeleton placeholders |
| `floatUp` | `translateY(9px)→0` + fade, .3s ease | Panel and list entries |
| `indet` | `left: -42% → 100%`, 1.3s | Indeterminate progress |
| `drift` | `translateY(0 → -16px → 0)`, 13–17s | Marketing gradient blobs |

**Responsive** — every multi-column region uses `repeat(auto-fit, minmax(Npx, 1fr))`.
Wide tables sit in horizontal scrollers with an explicit `min-width` on both header and
body rows so columns never crush. Fixed two-column layouts were deliberately removed.
Desktop is the primary experience; a tablet and phone breakpoint was scoped but not
designed.

---

## State Management

A single route string drives the whole app; screens are conditional on it.

```
route              current screen id
loading            drives the full-screen loader
navOpen {}         which nav groups are expanded
navFlyout          which group's flyout is open when collapsed
collapsed          sidebar collapsed
orgOpen / notifOpen / userOpen / searchQ      header chrome
modal / goalModal / inviteModal / auditOpen   overlays
expWizard / expStep / evidence                Improvement Engine overlays
dev / team / project / repo / finding         selected entity for detail screens
problemIdx / expIdx                           selected problem and experiment
ieStage                                       selected lifecycle stage
devTab / teamTab / settingsTab                active tab per screen
sortKey            leaderboard sort column
weights {}         scoring weights, validated to total 100
period             Daily | Weekly | Monthly | Quarterly | Yearly
baWindow           before/after comparison window
compareA/compareB  comparison slot indices
onbStep            onboarding step 1–7
ghStep / syncPct   provider connect flow
```

Navigating clears chrome state in the same update. Splitting that across two state updates
strands keys — this caused a real bug in the prototype.

One more caution learned the hard way: the view-model object is large, and a **duplicate
key silently overrides an earlier one**. In the prototype a second `pipeline` key wiped
the Improvement Engine lifecycle strip. Whatever structure you use, keep the namespace
flat and checked.

Data fetching follows the cadence contract in `DEVLYTICS-SPEC.md` §4.1.

---

## Design Tokens

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--primary` | `#372b73` | Primary action, sidebar base, first chart series, rank 1 |
| `--violet-500` | `#5b3f9e` | Hover on dark, rank 3, second series |
| `--peacock` | `#2E6E8E` | Rank 2, gradient midpoint |
| `--siphon` | `#0B7D9E` | Gradient endpoint, third chart series |
| `--siphon-ink` | `#0F5A73` | Siphon as text (4.5:1 safe) |
| `--lilac-chart` | `#8a6fc4` | Third grouped-bar series |
| `--ink-head` | `#241d4d` | Headings, primary values |
| `--ink-body` | `#475569` | Body copy |
| `--ink-muted` | `#5C6879` | Labels, metadata, activity-only metrics |
| `--page` | `#F6F7FB` | App background |
| `--card` | `#FFFFFF` | Cards, tables, modals |
| `--subtle` | `#FBFCFD` | Nested panels |
| `--hairline` | `#E2E8F0` | Borders |
| `--divider` | `#EFF2F7` | Row dividers |
| `--tint-violet` | `#F1EDFA` / border `#E6DDF6` | Selected, tinted buttons |
| `--tint-siphon` | `#EFF8FB` / border `#CFE7EF` | Recommendation blocks |
| `--tint-green` | `#F1FBF5` / border `#CDEEDC` | Fact blocks, proven states |
| `--improvement` | `#0F7D4F` | Positive deltas, passing, resolved |
| `--critical` | `#B4192F` | Blockers, failures, destructive |
| `--warning` | `#8A5A11` | At risk, stale, validation |
| `--warning-alt` | `#B4651A` | Medium severity |
| `--neutral` | `#5C6879` | Unchanged, non-scoring |

Gradients: primary button and loader ring
`linear-gradient(135deg,#372b73 0%,#0B7D9E 100%)`; sidebar
`linear-gradient(180deg,#0B7D9E 0%,#2E6E8E 34%,#372b73 100%)`; auth panel
`linear-gradient(160deg,#0B7D9E 0%,#2E6E8E 46%,#372b73 100%)`.

Every text token measures 4.5:1 or better against page, card and its own tint.
`#94A3B8` is **non-text only** — borders, rails, placeholder strokes.

### Type

IBM Plex Sans (UI) and IBM Plex Mono (numerics, labels, identifiers, code).

| Role | Style |
| --- | --- |
| Page title | `600 25px/1.15`, `-0.02em` |
| Section heading | `600 15px` |
| Card title | `600 13.5–16px` |
| Body | `13–14.5px`, line-height 1.55–1.62 |
| Meta | `11.5–12.5px`, muted |
| Mono label | `500 9–10px`, `.08–.09em`, uppercase |
| Big number | `600 21–40px` mono |

### Spacing, radius, shadow

Spacing: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 26 · 28 · 32 · 52.

Radius: 5 chip · 7–8 small · 9–10 button/input · 11–12 card · 14–16 panel · 20 pill ·
50% avatar.

Shadow: card `0 1px 2px rgba(16,24,40,.05)` · raised `0 1px 3px rgba(16,24,40,.06)` ·
hover `0 12px 28px rgba(55,43,115,.1)` · dropdown `0 18px 40px rgba(38,42,50,.14)` ·
modal `0 30px 70px rgba(20,14,45,.3)` · drawer `-20px 0 60px rgba(20,14,45,.2)` ·
on-gradient pill `0 4px 14px rgba(12,8,36,.26)`.

---

## Assets

In `assets/`:
- `devlytics-app-icon.png` — octopus mark, recoloured to the violet/peacock ramp
- `devlytics-wordmark-white.svg` — dark and gradient grounds
- `devlytics-logo-navy.svg` — light grounds
- `devlytics-logo-white.svg` — full lockup, dark grounds

The loader uses the octopus as **inline SVG** (viewBox `0 0 150.7 157.8`) so it scales
cleanly and inherits the gradient — the path data is in the loader markup in
`Devlytics.dc.html`.

All other iconography is inline SVG line-art at `stroke-width: 1.6–1.9`,
`stroke-linecap: round`, `stroke-linejoin: round`, on a 20×20 viewBox. No icon font, no
emoji except podium medals.

---

## Known constraints carried from the prototype

1. Product frames inside the marketing pages are HTML recreations of the dashboard, not
   screenshots. Substitute real captures when available.
2. Sample data is hard-coded. Shapes are correct; values are illustrative.
3. Charts are hand-built SVG and CSS. Replace with the codebase's charting library,
   preserving the series colours and the distinct-presentation-per-card rule.
4. The design is desktop-first. Tablet and phone breakpoints were scoped but not designed.
5. `support.js` is the prototype runtime. It is included for reference only — do not port
   it into the target codebase.
