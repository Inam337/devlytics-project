# Zentro API (NestJS)

eCommerce backend for the Zentro project.

## Quick start (Phase 0)

```bash
cd backend/myapp
pnpm install
# Optional: copy .env.example → .env

pnpm run start:dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000/ | Health / hello |
| http://localhost:3000/reference | Scalar API docs |
| http://localhost:3000/swagger | Swagger UI |

**CORS:** Enabled for `http://localhost:5173` (Vite) by default. Override with `CORS_ORIGINS` (comma-separated) in `.env`.

**Database:** PostgreSQL `ShopDB` on `localhost:5432` (see `.env.example`).

**Demo data:**

```bash
pnpm run seed:demo
pnpm run seed:demo:fresh   # reset and re-seed
```

See [docs/data.md](./docs/data.md).

## Docs

- [**Full project context**](../docs/project.md)
- [API reference](./docs/api-reference.md)
- [Architecture](./docs/backend-architecture.md)
- [Mock data](./docs/data.md)
- [Frontend project context](../../frontend/docs/project.md)
- [Frontend dev setup](../../frontend/docs/dev-setup.md)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run start:dev` | Watch mode |
| `pnpm run build` | Compile |
| `pnpm run seed:demo` | Load mock shop data |
| `pnpm run seed:demo:fresh` | Wipe demo commerce data and re-seed |

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## NestJS starter (reference)

### Project setup

```bash
$ npm install
```

### Compile and run

```bash
$ npm run start:dev
```

### Tests

```bash
$ npm run test
$ npm run test:e2e
$ npm run test:cov
```

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
