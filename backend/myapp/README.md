# Devlytics API (NestJS)

Engineering intelligence backend for Devlytics — organizations, teams, Git integration,
engineering metrics, code quality, scoring, rankings, AI analysis and improvement goals.

## Quick start

```bash
cd backend/myapp
npm install
# Copy .env.example → .env and fill in real values

npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000/api/v1 | API base (see `API_PREFIX` in `.env`) |
| http://localhost:3000/api/v1/docs | Swagger UI |
| http://localhost:3000/api/v1/reference | Scalar API reference |
| http://localhost:3000/api/v1/openapi.json | Raw OpenAPI document |

**CORS:** Enabled for `http://localhost:5173` (Vite) by default. Override with `CORS_ORIGINS` (comma-separated) in `.env`.

**Database:** PostgreSQL `devlytics_db` (see `.env.example` for host/port/credentials).

**Seed data:**

```bash
npm run db:seed
```

## Docs

- [**Full project context**](../../docs/devlytics.md)
- [**API endpoint reference (locked, current)**](../../docs/API_ENDPOINTS.md)
- [Backend API requirements spec (original plan)](../../docs/Devlytics_Final_Backend_PostgreSQL_API_Requirements.md)
- [Frontend project context](../../frontend/docs/project.md)
- [Frontend dev setup](../../frontend/docs/dev-setup.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run dev migrations |
| `npm run prisma:deploy` | Apply migrations (prod) |
| `npm run db:seed` | Seed the database |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npm run test:cov` | Coverage report |
