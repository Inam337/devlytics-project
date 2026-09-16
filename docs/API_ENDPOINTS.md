# Devlytics — Final API Endpoint Reference (Locked)

**Status:** Locked — verified against `backend/myapp/src/**/*.controller.ts` on 2026-09-16.
This file supersedes §7 "REST API Structure" in
[`Devlytics_Final_Backend_PostgreSQL_API_Requirements.md`](./Devlytics_Final_Backend_PostgreSQL_API_Requirements.md),
which describes the original planned surface. The backend has grown beyond
that plan (Improvement Engine experiments, Git identity resolution, sync
jobs, roles/permissions reads, department CRUD, achievements, audit logs,
health) — this document is the current source of truth for frontend
integration. When a route changes, update this file in the same PR.

**Base URL:** `http://localhost:3000/api/v1` (path prefix is `API_PREFIX`,
default `api/v1`; host/port come from `APP_URL`/`PORT`).

**Live, always-current contract:**
- Swagger UI — `GET /api/v1/docs`
- Scalar reference — `GET /api/v1/reference`
- Raw OpenAPI document — `GET /api/v1/openapi.json`

**Auth:** Bearer JWT (`Authorization: Bearer <accessToken>`) on every route
except those marked **Public**. Public routes are register/login/refresh/
password-reset/accept-invitation, `GET /health`, and the two inbound
`/webhooks/*` routes (verified by provider signature instead of a JWT).
Every other route also requires the permission listed, enforced by
`@RequirePermissions(...)` — see `src/common/constants/permissions.ts` for
the full role → permission matrix.

Pagination (`page`, `limit`, `search`, `sortBy`, `sortOrder`) is available on
every list endpoint via the shared `PaginationQueryDto`, not repeated below.

---

## Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register an organization and its first Organization Admin |
| POST | `/auth/login` | Public | Sign in with email and password |
| POST | `/auth/refresh` | Public | Exchange a refresh token for a new pair (rotates the old one) |
| POST | `/auth/logout` | Bearer | Revoke the presented refresh token, or every session when omitted |
| GET | `/auth/me` | Bearer | Signed-in identity, organization, role and permission scope |
| POST | `/auth/forgot-password` | Public | Request a single-use password reset link (30 min expiry) |
| POST | `/auth/reset-password` | Public | Complete a password reset with the emailed token |
| POST | `/auth/change-password` | Bearer | Change your own password (revokes every existing session) |
| POST | `/auth/accept-invitation` | Public | Set the first password for an invited member and activate membership |

## Organizations — `/organizations`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/organizations` | `organization:read` | Organizations the caller belongs to |
| POST | `/organizations` | `organization:update` | Create an organization (provisions roles, weights, local AI provider) |
| GET | `/organizations/:id` | `organization:read` | Organization detail with entity counts |
| PATCH | `/organizations/:id` | `organization:update` | Update settings, branding or setup-wizard progress |

## Users — `/users`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/users` | `user:read` | List users |
| POST | `/users` | `user:create` | Create/invite a user |
| GET | `/users/:id` | `user:read` | User detail |
| PATCH | `/users/:id` | `user:update` | Update a user |
| DELETE | `/users/:id` | `user:delete` | Remove a user |

## Roles & Permissions — `/roles`, `/permissions`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/roles` | `role:read` | List the organization's roles |
| GET | `/roles/:id` | `role:read` | Role detail with granted permissions |
| PATCH | `/roles/:id/permissions` | `role:update` | Change a role's permission grants |
| GET | `/permissions` | `role:read` | Full permission catalog |

## Departments — `/departments`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/departments` | `department:read` | List departments |
| POST | `/departments` | `department:write` | Create a department |
| GET | `/departments/:id` | `department:read` | Department detail |
| PATCH | `/departments/:id` | `department:write` | Update a department |
| DELETE | `/departments/:id` | `department:write` | Delete a department |

## Teams — `/teams`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/teams` | `team:read` | List teams |
| POST | `/teams` | `team:write` | Create a team |
| GET | `/teams/:id` | `team:read` | Team detail |
| PATCH | `/teams/:id` | `team:write` | Update a team |
| DELETE | `/teams/:id` | `team:write` | Delete a team |
| GET | `/teams/:id/members` | `team:read` | List team members |
| POST | `/teams/:id/members` | `team:write` | Add a member to the team |
| DELETE | `/teams/:id/members/:userId` | `team:write` | Remove a member from the team |

## Projects — `/projects`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/projects` | `project:read` | Project directory with status, counts, progress and quality |
| POST | `/projects` | `project:write` | Create a project |
| GET | `/projects/:id` | `project:read` | Project detail with members and repositories in scope |
| PATCH | `/projects/:id` | `project:write` | Update a project |
| DELETE | `/projects/:id` | `project:write` | Delete a project that has no repositories assigned |
| POST | `/projects/:id/members` | `project:write` | Assign a member to the project |
| DELETE | `/projects/:id/members/:userId` | `project:write` | Remove a member from the project |

## Git Integration — `/git`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/git/providers` | `integration:read` | Connected Git providers |
| POST | `/git/github/connect` | `integration:write` | Connect a GitHub account/org |
| POST | `/git/gitlab/connect` | `integration:write` | Connect a GitLab account/group |
| GET | `/git/providers/:id/discover` | `integration:read` | Discover importable repositories for a connected provider |
| POST | `/git/providers/:id/import` | `integration:write` | Import selected repositories |
| DELETE | `/git/providers/:id` | `integration:write` | Disconnect a Git provider |
| GET | `/git/identities` | `integration:read` | Git identities discovered from commit authorship |
| GET | `/git/identities/review-queue` | `integration:read` | Unmatched/ambiguous identities needing manual review |
| PATCH | `/git/identities/:id/link` | `integration:write` | Link a Git identity to a Devlytics user |
| PATCH | `/git/identities/:id/classify` | `integration:write` | Reclassify an identity (matched / unmatched / bot) |

## Repositories — `/repositories`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/repositories` | `repository:read` | Repository table: provider, project, team, commits, quality, coverage |
| GET | `/repositories/:id` | `repository:read` | Repository detail: KPIs, coverage trend, top contributors |
| PATCH | `/repositories/:id` | `repository:write` | Reassign a repository to a project or team |
| GET | `/repositories/:id/members` | `repository:read` | Contributors to this repository |
| GET | `/repositories/:id/commits` | `activity:read` | Commits (bots excluded by default) |
| GET | `/repositories/:id/pull-requests` | `activity:read` | Pull requests |
| GET | `/repositories/:id/reviews` | `activity:read` | Pull request reviews |
| GET | `/repositories/:id/issues` | `activity:read` | Issues |
| GET | `/repositories/:id/pipelines` | `activity:read` | CI pipeline runs |
| GET | `/repositories/:id/deployments` | `activity:read` | Deployments |
| POST | `/repositories/:id/sync` | `repository:sync` | Queue a sync job for one repository |

## Sync — `/sync`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/sync/jobs` | `sync:read` | Sync job history |
| GET | `/sync/progress` | `sync:read` | In-flight sync progress |

## Webhooks — `/webhooks`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/webhooks/github` | Public (HMAC signature) | Inbound GitHub webhook |
| POST | `/webhooks/gitlab` | Public (token header) | Inbound GitLab webhook |

## Metrics — `/metrics`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/metrics/developers` | `metric:read` | Developer engineering metrics for a period |
| GET | `/metrics/developers/:id` | `metric:read` | One developer's metrics with a daily trend |
| GET | `/metrics/teams` | `metric:read` | Team engineering metrics for a period |
| GET | `/metrics/teams/:id` | `metric:read` | One team's metrics |
| GET | `/metrics/repositories/:id` | `metric:read` | One repository's activity metrics |

## Quality — `/quality`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/quality/scan` | `quality:write` | Queue a deterministic quality analysis run for a repository |
| GET | `/quality/summary` | `quality:read` | Eight-KPI code quality summary across repositories |
| GET | `/quality/snapshots` | `quality:read` | Quality snapshot history |
| GET | `/quality/issues` | `quality:read` | Findings: observed fact, AI inference and recommendation |
| GET | `/quality/issues/:id` | `quality:read` | Finding detail |
| PATCH | `/quality/issues/:id/status` | `quality:write` | Update a finding's status |

## Scoring — `/scoring/rules`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/scoring/rules` | `scoring:read` | Active scoring weight configuration |
| POST | `/scoring/rules` | `scoring:write` | Save a new weight version (must total 100%) |
| PATCH | `/scoring/rules` | `scoring:write` | Same as POST — save a new weight version |

## Rankings — `/rankings`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/rankings/developers` | `ranking:read` | Developer leaderboard for a period |
| GET | `/rankings/teams` | `ranking:read` | Team leaderboard for a period |
| GET | `/rankings/history` | `ranking:read` | Ranking history across periods |

## AI — `/ai`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/ai/providers` | `ai:read` | AI providers available to this organization |
| GET | `/ai/integrations` | `ai:read` | Configured AI integrations (API keys never returned) |
| POST | `/ai/integrations` | `ai:write` | Configure an AI integration (external providers are opt-in) |
| PATCH | `/ai/integrations/:id` | `ai:write` | Update an AI integration |
| DELETE | `/ai/integrations/:id` | `ai:write` | Remove an AI integration |
| POST | `/ai/analysis` | `ai:run` | Run deterministic analysis then AI interpretation for a repository |
| GET | `/ai/analysis` | `ai:read` | Analysis run history |
| GET | `/ai/analysis/:id` | `ai:read` | Analysis run detail with findings and recommendations |
| POST | `/ai/analysis/:id/retry` | `ai:run` | Retry AI interpretation for findings still missing one |
| GET | `/ai/usage` | `ai:read` | AI usage (informational only, never a ranking reward) |

## Improvements (Recommendations) — `/improvements/recommendations`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/improvements/recommendations` | `improvement:read` | AI recommendations with their observed fact |
| GET | `/improvements/recommendations/:id` | `improvement:read` | Recommendation detail |
| PATCH | `/improvements/recommendations/:id` | `improvement:write` | Accept, reject or mark a recommendation implemented |

## Improvement Insights — `/improvements`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/improvements/dashboard` | `improvement:read` | Improvement Engine dashboard: active experiments, top problems, recent proofs, trend |
| GET | `/improvements/problems` | `improvement:read` | Detected engineering problems, derived from open quality issues |
| GET | `/improvements/history` | `improvement:read` | Completed improvement experiments with their verified results |

## Improvement Engine — Experiments — `/improvements/experiments`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/improvements/experiments` | `improvement:write` | Create an engineering improvement experiment |
| GET | `/improvements/experiments` | `improvement:read` | List experiments |
| GET | `/improvements/experiments/:id` | `improvement:read` | Experiment detail with its metrics and proof |
| PATCH | `/improvements/experiments/:id` | `improvement:write` | Edit experiment content, or schedule/cancel it manually |
| DELETE | `/improvements/experiments/:id` | `improvement:write` | Delete a draft or cancelled experiment |
| POST | `/improvements/experiments/:id/start` | `improvement:write` | Start (or resume) — captures baselines on first activation |
| POST | `/improvements/experiments/:id/pause` | `improvement:write` | Pause an active experiment |
| POST | `/improvements/experiments/:id/complete` | `improvement:write` | Complete — captures final measurements from stored activity |
| POST | `/improvements/experiments/:id/cancel` | `improvement:write` | Cancel the experiment |
| GET | `/improvements/experiments/:id/metrics` | `improvement:read` | List an experiment's metrics |
| POST | `/improvements/experiments/:id/metrics` | `improvement:write` | Add a metric (baseline auto-calculated if the experiment has started) |
| PATCH | `/improvements/experiments/:id/metrics/:metricId` | `improvement:write` | Edit a metric's name, unit, target or primary flag |
| DELETE | `/improvements/experiments/:id/metrics/:metricId` | `improvement:write` | Remove a metric from the experiment |
| GET | `/improvements/experiments/:id/progress` | `improvement:read` | Progress of each metric toward its target |
| POST | `/improvements/experiments/:id/verify` | `improvement:write` | Verify a completed experiment and produce an improvement proof |
| GET | `/improvements/experiments/:id/proof` | `improvement:read` | The improvement proof produced by verification |

## Self-Evaluations — `/self-evaluations`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/self-evaluations` | `self_evaluation:write` | Create a self-evaluation for a period |
| GET | `/self-evaluations` | `self_evaluation:read` | List self-evaluations |
| GET | `/self-evaluations/:id` | `self_evaluation:read` | Self-evaluation detail with its category items |
| PATCH | `/self-evaluations/:id` | `self_evaluation:write` | Update, submit or review a self-evaluation |

## Goals — `/goals`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/goals` | `goal:write` | Create an improvement goal with a measured baseline |
| GET | `/goals` | `goal:read` | List goals |
| GET | `/goals/:id` | `goal:read` | Goal detail with its progress history |
| PATCH | `/goals/:id` | `goal:write` | Edit a goal, or abandon it (completion is never set manually) |
| DELETE | `/goals/:id` | `goal:write` | Delete a goal |
| POST | `/goals/:id/progress` | `goal:write` | Re-measure progress against the latest analysis run |
| GET | `/goals/:id/progress` | `goal:read` | Progress history for a goal |

## Achievements — `/achievements`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/achievements/me` | `achievement:read` | The caller's badges — earned, in progress and locked, with evidence |

## Dashboard — root-level

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/dashboard/overview` | `dashboard:read` | Organization-wide dashboard overview |
| GET | `/developers/:id/dashboard` | `dashboard:read` | One developer's dashboard |
| GET | `/teams/:id/dashboard` | `dashboard:read` | One team's dashboard |
| GET | `/repositories/:id/dashboard` | `dashboard:read` | One repository's dashboard |

## Notifications — `/notifications`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/notifications` | `notification:read` | List the caller's notifications |
| GET | `/notifications/unread-count` | `notification:read` | Unread badge count for the header |
| PATCH | `/notifications/read-all` | `notification:read` | Mark every unread notification as read |
| PATCH | `/notifications/:id/read` | `notification:read` | Mark one notification as read |

## Reports — `/reports`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/reports/developers` | `report:read` | Developer report |
| GET | `/reports/teams` | `report:read` | Team report |
| GET | `/reports/repositories` | `report:read` | Repository report |
| GET | `/reports/quality` | `report:read` | Quality report |
| GET | `/reports/rankings` | `report:read` | Rankings report |
| GET | `/reports/improvements` | `report:read` | Improvements report |

## Audit Logs — `/audit-logs`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/audit-logs` | `audit:read` | List audit log entries |
| GET | `/audit-logs/:id` | `audit:read` | Audit log entry detail |

## Health — `/health`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness and database readiness probe used by Docker |

---

## Endpoint count

28 controllers, 145 routes (counted from the tables above). The live OpenAPI
document (`/api/v1/openapi.json`) is generated directly from this same
controller source and will never drift from it — treat it as the
machine-readable version of this file.
