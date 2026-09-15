import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/setup-app';
import { resetDatabase } from './utils/reset-database';

/**
 * Covers docs requirements §16 "Critical Security Test": authentication,
 * validation, refresh-token rotation and cross-organization access denial.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  const stamp = Date.now();

  beforeAll(async () => {
    // Reset before the app boots — ReferenceDataService re-seeds permissions
    // and achievements as part of app.init(), so nothing re-syncs afterwards.
    await resetDatabase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('registers an organization and its first admin (201)', async () => {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({
        email: `admin${stamp}@example.test`,
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Str0ng!Passphrase',
        organization: { name: `Test Org ${stamp}` },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.role.key).toBe('ORGANIZATION_ADMIN');
    expect(response.body.data.permissions.length).toBeGreaterThan(0);
  });

  it('rejects a weak password (400 VALIDATION_FAILED)', async () => {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({
        email: `weak${stamp}@example.test`,
        firstName: 'A',
        lastName: 'B',
        password: 'weak',
        organization: { name: 'Weak Org' },
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('rejects duplicate registration (409)', async () => {
    const response = await request(server())
      .post('/api/v1/auth/register')
      .send({
        email: `admin${stamp}@example.test`,
        firstName: 'A',
        lastName: 'B',
        password: 'Str0ng!Passphrase',
        organization: { name: 'Duplicate Org' },
      })
      .expect(409);

    expect(response.body.code).toBe('USER_ALREADY_EXISTS');
  });

  it('rejects an invalid password on login (401 INVALID_CREDENTIALS)', async () => {
    const response = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: `admin${stamp}@example.test`, password: 'WrongPassword123!' })
      .expect(401);

    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in and returns a working token pair', async () => {
    const response = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: `admin${stamp}@example.test`, password: 'Str0ng!Passphrase' })
      .expect(200);

    const { accessToken, refreshToken } = response.body.data;
    expect(accessToken).toEqual(expect.any(String));

    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.user.email).toBe(`admin${stamp}@example.test`);

    const refreshed = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));

    // The rotated refresh token cannot be replayed.
    await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401)
      .expect((res) => expect(res.body.code).toBe('INVALID_REFRESH_TOKEN'));
  });

  it('rejects requests with no token (401)', async () => {
    const response = await request(server()).get('/api/v1/users').expect(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with a garbage token (401)', async () => {
    const response = await request(server())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  describe('tenant isolation', () => {
    it('never lets one organization read or act on another organization\'s resource', async () => {
      const orgAEmail = `orga${stamp}@example.test`;
      const orgBEmail = `orgb${stamp}@example.test`;

      const orgA = await request(server())
        .post('/api/v1/auth/register')
        .send({
          email: orgAEmail,
          firstName: 'Org',
          lastName: 'A',
          password: 'Str0ng!Passphrase',
          organization: { name: `Org A ${stamp}` },
        })
        .expect(201);

      const orgB = await request(server())
        .post('/api/v1/auth/register')
        .send({
          email: orgBEmail,
          firstName: 'Org',
          lastName: 'B',
          password: 'Str0ng!Passphrase',
          organization: { name: `Org B ${stamp}` },
        })
        .expect(201);

      const tokenA = orgA.body.data.accessToken;
      const tokenB = orgB.body.data.accessToken;

      const team = await request(server())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Org A Team', code: `TEAMA${stamp}` })
        .expect(201);

      const teamId = team.body.data.id;

      // Organization B requesting Organization A's team resolves to 404, not the resource.
      const crossRead = await request(server())
        .get(`/api/v1/teams/${teamId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
      expect(crossRead.body.code).toBe('TEAM_NOT_FOUND');

      const crossWrite = await request(server())
        .patch(`/api/v1/teams/${teamId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hijacked' })
        .expect(404);
      expect(crossWrite.body.code).toBe('TEAM_NOT_FOUND');

      // Organization A can still read its own team.
      await request(server())
        .get(`/api/v1/teams/${teamId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });
  });

  describe('RBAC', () => {
    it('forbids a developer from writing scoring rules (403)', async () => {
      const adminEmail = `rbacadmin${stamp}@example.test`;
      const devEmail = `rbacdev${stamp}@example.test`;

      const admin = await request(server())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          firstName: 'RBAC',
          lastName: 'Admin',
          password: 'Str0ng!Passphrase',
          organization: { name: `RBAC Org ${stamp}` },
        })
        .expect(201);

      const adminToken = admin.body.data.accessToken;
      const organizationId = admin.body.data.organization.id;

      await request(server())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: devEmail, firstName: 'Dev', lastName: 'Eloper', roleKey: 'DEVELOPER' })
        .expect(201);

      const accepted = await request(server())
        .post('/api/v1/auth/accept-invitation')
        .send({ email: devEmail, password: 'DevStr0ng!Pass', organizationId })
        .expect(200);

      const devToken = accepted.body.data.accessToken;

      const forbidden = await request(server())
        .patch('/api/v1/scoring/rules')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ categories: [] })
        .expect(403);
      expect(forbidden.body.code).toBe('FORBIDDEN');

      // Read access still works for a developer.
      await request(server())
        .get('/api/v1/scoring/rules')
        .set('Authorization', `Bearer ${devToken}`)
        .expect(200);
    });
  });
});
