# Devlytics — Backend Feature Specification

Derived from the delivered design files. Every screen, state, entity and rule below
exists in the prototype and is what the backend must support.

**Design files**
| File | Covers |
| --- | --- |
| `Devlytics.dc.html` | The application (auth, onboarding, all app screens) |
| `Devlytics States.dc.html` | Empty / loading / error states and all email templates |
| `Devlytics Controls.dc.html` | UI control library |
| `Devlytics Sync Flow.dc.html` | Provider sync pipeline behaviour |
| `Devlytics Landing.dc.html` | Marketing site |
| `Devlytics Promo Kit.dc.html` | Campaign page and social copy |
| `Devlytics Palette.dc.html` | Colour system with measured contrast |

---

## 1. Product principles that constrain the backend

These are not stylistic. Each one implies validation or storage the backend must enforce.

1. **Lines of code carry zero scoring weight.** LOC is stored and displayed as an
   activity metric only, always labelled as such. It must never contribute to a score.
2. **Static analysis produces evidence; AI only interprets it.** Every finding stores an
   observed fact (with the rule ID that produced it) separately from the AI inference
   (with a confidence score) and the recommendation.
3. **A goal completes only when a later analysis run proves it.** There is no manual
   "mark complete". Completion is computed by comparing a stored baseline to a later run.
4. **Rankings are versioned by weight configuration.** Every computed ranking stores the
   weight version used, so changing weights never silently rewrites history.
5. **Failures freeze, they do not drift.** When collection breaks, the last good values
   are retained and flagged stale — never zeroed or extrapolated.
6. **Bot commits are excluded from scoring.** Identified automation accounts are recorded
   but never scored.
7. **Analysis runs locally by default.** External AI providers are opt-in per organization
   and must route through a context sanitizer.

---

## 2. Domain model

### 2.1 Organization hierarchy

```
Organization
 └── Department
      └── Team
           └── Developer (User with a developer profile)
Organization
 └── Project ──< Repository
```

**Organization** — name, industry, timezone, logo, favicon, primary/secondary colour,
date format, currency. Holds the active scoring weight version.

**Department** — name, manager (User). Belongs to an Organization. Groups Teams for
reporting.

**Team** — name, unique team code (e.g. `FE-CORE`), description, colour, avatar
(uploaded image, generated initials, or chosen icon), team lead, department.
Derived: member count, project count, repository count, current score, current rank.

**Project** — name, code (e.g. `PAY-01`), status (`Active` | `At Risk` | `Completed`),
owning team, member count, progress percentage, project score.

**Repository** — name, provider (`GitHub` | `GitLab`), external ID, project, owning team,
primary technology, sync state (`Synced` | `Syncing` | `Queued` | `Disconnected` |
`Never synced`), last sync timestamp, CI status, and derived counts (commits, PRs,
quality score, coverage).

**User** — name, email, password hash, avatar, role, status
(`Active` | `Invited` | `Suspended`), last login. A user may hold multiple Git identities.

**GitIdentity** — provider, username, commit email, linked User (nullable), classification
(`matched` | `unmatched` | `bot`). Unmatched identities are held in a review queue and
score nothing.

### 2.2 Roles and permissions

Six roles are shown in Settings → Users, each with an explicit permission scope:

| Role | Scope |
| --- | --- |
| Organization Admin | Everything, including scoring weights, integrations, security, audit |
| Department Manager | All teams within their department; read-only on org settings |
| Team Lead | Their team's members, projects, repositories and goals |
| Developer | Own profile, own findings and goals; read-only leaderboards |
| Auditor | Read-only across the organization, including audit logs |
| Billing | Subscription and invoices only |

Permission changes are audit-logged with before/after scope.

---

## 3. Authentication and onboarding

### 3.1 Auth
- Email + password sign-in.
- OAuth sign-in with GitHub and Google.
- Registration, forgot password, reset password (single-use link, 30-minute expiry).
- Invitation acceptance flow (set password, confirm Git identities).
- Suspension rule: no commits, reviews or logins for 90 consecutive days →
  automatic suspension, audit-logged, excluded from current rankings but historical
  scores preserved.

### 3.2 Organization setup wizard — 7 steps
Each step must be independently persistable and resumable; the user may skip to the end.

1. **Organization information** — name, industry, timezone, logo
2. **Create a department** — name, manager
3. **Create first team** — name, code, colour, avatar, lead, department
4. **Invite developers** — email, role, team (repeatable rows)
5. **Connect a Git provider** — GitHub or GitLab, with scope disclosure
6. **Import repositories** — multi-select from discovered repositories
7. **Complete** — summary and initial sync trigger

---

## 4. Provider integration and sync pipeline

Modelled in detail in `Devlytics Sync Flow.dc.html`. Six stages:

### Stage 1 — Connect
OAuth authorization, read-only.
- GitHub scopes: `repo:read`, `org:read`, `actions:read`
- GitLab scopes: `read_api`, `read_repository`
- Register webhooks: push, pull_request, pipeline, issues
- Discover available repositories; do not collect yet

### Stage 2 — Import history
Backfill 12 months per selected repository, oldest first, so trends have a baseline.
Collected: commits, pull requests, reviews, issues, CI runs.
Per-repository progress must be queryable. **Scores are withheld until every selected
repository completes** — a partial ranking would order developers wrongly.

### Stage 3 — Match identities
Match commit email → provider username → invited member email.
- Matched → attach to User
- Unmatched → review queue, scores nothing
- Bot → excluded from all scoring

### Stage 4 — Analyze
Deterministic static analysis produces measurements per repository and per changed file:
duplication, cyclomatic complexity, test coverage, security findings, performance issues,
maintainability rating. Each finding records the rule ID that produced it.

### Stage 5 — Score and rank
Compute developer, team and project scores from the analysis run. Persist with the
weight version. Generate leaderboard positions for the active period.

### Stage 6 — Stay current
Webhook events update activity within seconds. Incremental analysis runs are triggered by
merges to a default branch. A five-minute reconciliation poll catches dropped webhooks.

### 4.1 Refresh cadence contract

| Surface | Trigger | Freshness |
| --- | --- | --- |
| Activity feed, sync status | Provider webhook | Seconds |
| Repository commit / PR counts | Incremental collection | 5 minutes |
| Code quality, coverage, findings | Analysis run on merge to default | Per run |
| Developer and team scores | Recalculated after each analysis run | Per run |
| Leaderboard positions | Period close (daily / weekly / monthly) | Per period |
| Goal verification | Compared to baseline on next run | Per run |

Every surface must expose its own freshness so a stale number is never read as current.

### 4.2 Failure behaviour

| Failure | Behaviour |
| --- | --- |
| Token expired | Collection stops for that provider. Repositories show last successful sync; metrics hold at that value. Admin alert email. |
| Rate limit reached | Remaining requests queue with backoff. Repository shows `Syncing`; derived scores marked partial. |
| Webhook delivery missed | Five-minute incremental poll reconciles. A missed event delays a number, never loses it. |
| Analysis run fails | Scores stay on the last successful run and keep showing its run number. No partial ranking is published. |

---

## 5. Scoring engine

### 5.1 Weight categories
Eight configurable categories. **Weights must total exactly 100% — saving is blocked
otherwise** (the UI shows a blocking error state for this).

| Category | Default weight |
| --- | --- |
| Code Quality | 25% |
| Delivery | 20% |
| Code Review | 15% |
| Testing | 15% |
| Reliability | 10% |
| Collaboration | 5% |
| Documentation | 5% |
| Project Impact | 5% |

Changing weights creates a new weight version. Existing rankings retain their original
version. Change is audit-logged with before/after and a reason field.

### 5.2 Team scoring
A team score is computed **from its members' measured evidence, not by averaging their
leaderboard ranks** — averaging ranks would let one strong developer mask a weak team.

### 5.3 Periods
Daily, Weekly, Monthly, Quarterly, Yearly. Leaderboard positions close per period and
are retained for ranking history.

---

## 6. Application screens and required endpoints

### Dashboard
Nine KPI tiles (developers, teams, projects, repositories, commits, pull requests,
reviews, lines of code, quality score), top-5 developer podium and table, top teams,
recent activity feed, engineering activity chart, code quality summary, ranking trend,
AI analytics summary.

### Leaderboards
- **Developer leaderboard** — podium (top 3) plus sortable table: rank, developer, team,
  score, quality, delivery, reviews, testing, trend. Sortable by any numeric column.
- **Team leaderboard** — podium plus table: rank, team, score, members, projects, repos,
  quality, testing, trend.

Filters throughout: date range, department, team, project, repository.

### Developers
Directory grid, plus a profile with ten tabs: Overview, Activity, Code Quality, Reviews,
Testing, Reliability, Projects, Repositories, Ranking History, Achievements.
Profile shows score breakdown by category, activity KPIs, ranking history and badges.

### Comparison view
Two selectable developers side by side across all seven scored categories, with per-row
leader highlighting and a plain-language summary. Reached from a profile.

### Teams
Directory grid, plus a team profile with nine tabs: Overview, Members, Projects,
Repositories, Performance, Code Quality, Analytics, Ranking History, Achievements.
Create-team wizard: information → avatar and colour → member selection.

### Projects
Directory with status, team, member and repository counts, progress and score.
Project detail shows quality KPIs and the repositories in scope.

### Repositories
Table: provider, name, project, team, commits, quality, coverage, last sync.
Repository detail: KPIs, coverage trend, top contributors, manual sync trigger.

### Code Quality
Eight KPIs (quality score, bugs, code smells, security issues, coverage, duplication,
complexity, maintainability), quality trend, coverage trend, issues by severity
(Blocker / Critical / Major / Minor), quality by repository.

### Improvement Center
List of findings. Each finding stores and displays, separately:
- **Observed fact** — from a named static-analysis rule, with file and line
- **AI inference** — with a confidence score
- **Recommendation** — the concrete change to make
Plus severity, estimated effort and estimated impact. A finding converts to a goal.

### Goals
Goals with a recorded baseline, target, current value and state
(`Active` | `At risk` | `Completed`). At-risk rule: no measurable movement in 14 days.
Completion is computed by re-analysis only.

### Analytics
Six chart cards with distinct presentations (line, area, grouped bar, histogram,
horizontal bar, donut): engineering activity, commit trend, PR trend, review trend,
LOC trend (labelled activity-only), CI success rate. Period switcher and filters.

### AI Analytics
Adoption KPIs, tool distribution (Cursor, ChatGPT, Claude, Gemini, Antigravity, local),
adoption by team. **Explicitly excluded from scoring** and labelled as such in the UI.

### Achievements
Ten badges grouped Earned / In progress / Locked, with a completion ring and, for each,
the evidence behind it (e.g. "41 of 55 bugs resolved").

### Reports
Seven report types: Developer Performance, Team Performance, Project Performance,
Repository Performance, Code Quality, Engineering Productivity, AI Analytics.
Scope controls (date range, department, team, project, repository), preview, and export
to **PDF** and **CSV**.

### Integrations
Provider cards with connection state, repository count and last sync. Actions: sync now,
reconnect, configure, disconnect. AI tool integrations listed as read-only telemetry.
Full GitHub/GitLab connect flow: authorize → select organization → select repositories →
sync with live progress → done.

### Settings
Thirteen sections: Organization, Branding, Users, Departments, Teams, Projects,
Repositories, Scoring Rules, Integrations, AI, Notifications, Security, Audit Logs.

- **Scoring Rules** — weight editor with the 100% total constraint
- **Notifications** — event × channel toggle matrix
- **Audit Logs** — full change history; each entry opens a detail drawer showing actor,
  timestamp, IP, what happened, before/after values and the reason

---

## 7. Reporting and PDF export

Two AI-analysis reports are generated at period close and emailed with a PDF attached.

**Team report** (~22 pages) — four sections:
1. Measured evidence — duplication, complexity, coverage, security per repository
2. AI interpretation — each inference with confidence score and source rule
3. Member contribution — every member on the same weighted categories
4. Recommended next quarter — goals with baselines the platform will verify

**Individual report** (~9 pages) — strengths, one specific area to work on, and AI notes
that state their confidence and what they do *not* measure. Copied to the developer's
lead; never shared with other developers.

The PDF is a snapshot of a specific analysis run and must record that run number, since
live figures may have moved since.

---

## 8. Notifications and email

Sixteen templates, all designed in `Devlytics States.dc.html`. Each needs a subject,
preheader, body, optional metric row, optional list, optional PDF attachment, CTA and
footer.

**Transactional** — organization created, developer invitation, password reset,
added to a team, assigned to a project

**Digest** — analysis run complete, weekly developer summary, team leaderboard digest,
project completion summary, AI analysis report (team), AI analysis report (individual)

**Milestone** — rank change (moves of 2+ places), achievement earned, improvement goal
completed

**Alert** — sync failure (after two consecutive failures), scoring rules changed

In-app notifications share the same event set, with an unread count in the header.

---

## 9. States every list and detail endpoint must support

Designed in `Devlytics States.dc.html`:
- **Empty (first run)** — nothing collected yet, with the action that starts collection
- **Empty (filtered)** — data exists but the filter matched nothing
- **Loading** — full-screen overlay loader in the app; skeletons in embedded panels
- **Partial** — some repositories synced, results marked incomplete
- **Stale** — last good values with the timestamp they froze at
- **Permission denied** — role lacks scope, with who to ask
- **Error** — with the specific cause and a retry action

---

## 10. Audit logging

Every state-changing action is logged with: actor, timestamp, IP address, category,
human-readable summary, before/after value pairs, and a reason.
Categories in the design: Scoring, Integration, Repository, User, Role, AI.
Audit entries are immutable and readable by Organization Admin and Auditor roles.

---

## 11. Design system reference

**Colours** — violet `#372b73` (primary), siphon `#0B7D9E`, peacock `#2E6E8E`,
lilac `#5b3f9e`, ink `#241d4d`, body `#475569`, muted `#5C6879`, page `#F6F7FB`,
card `#FFFFFF`, hairline `#E2E8F0`.
Semantic: improvement `#0F7D4F`, critical `#B4192F`, warning `#8A5A11`, neutral `#5C6879`.
All text tokens measured at 4.5:1 or better against their own ground.

**Type** — IBM Plex Sans for UI, IBM Plex Mono for numerics, labels and identifiers.

**Ranking colours** — 1st violet, 2nd peacock, 3rd lilac.
