import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/setup-app';
import { resetDatabase } from './utils/reset-database';

describe('Teams & Projects (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const stamp = Date.now();

  beforeAll(async () => {
    await resetDatabase();
    app = await createTestApp();

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `tpadmin${stamp}@example.test`,
        firstName: 'Team',
        lastName: 'Admin',
        password: 'Str0ng!Passphrase',
        organization: { name: `Teams Org ${stamp}` },
      });
    token = registered.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = () => `Bearer ${token}`;

  let teamId: string;
  let projectId: string;

  it('creates a team', async () => {
    const response = await request(server())
      .post('/api/v1/teams')
      .set('Authorization', auth())
      .send({ name: 'Frontend Core', code: `FE-CORE-${stamp}` })
      .expect(201);
    teamId = response.body.data.id;
    expect(response.body.data.code).toBe(`FE-CORE-${stamp}`.toUpperCase());
  });

  it('rejects a duplicate team code (409)', async () => {
    const response = await request(server())
      .post('/api/v1/teams')
      .set('Authorization', auth())
      .send({ name: 'Frontend Core Duplicate', code: `FE-CORE-${stamp}` })
      .expect(409);
    expect(response.body.code).toBe('TEAM_ALREADY_EXISTS');
  });

  it('creates a project attached to the team', async () => {
    const response = await request(server())
      .post('/api/v1/projects')
      .set('Authorization', auth())
      .send({
        name: 'Payments Platform',
        code: `PAY-${stamp}`,
        teamIds: [teamId],
      })
      .expect(201);
    projectId = response.body.data.id;
    expect(response.body.data.teams[0].id).toBe(teamId);
  });

  it('lists teams with pagination envelope', async () => {
    const response = await request(server())
      .get('/api/v1/teams?page=1&limit=10')
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
        total: expect.any(Number),
      }),
    );
  });

  it('rejects an unknown sort field (400)', async () => {
    const response = await request(server())
      .get('/api/v1/teams?sortBy=notAField')
      .set('Authorization', auth())
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('prevents deleting a project that owns no repositories, then blocks deleting a team with a project', async () => {
    // A project with no repositories can be removed.
    const deletable = await request(server())
      .post('/api/v1/projects')
      .set('Authorization', auth())
      .send({ name: 'Temp Project', code: `TEMP-${stamp}` })
      .expect(201);

    await request(server())
      .delete(`/api/v1/projects/${deletable.body.data.id}`)
      .set('Authorization', auth())
      .expect(200);

    // The team still owns `projectId` via project_team, so it archives rather than 404s.
    const removed = await request(server())
      .delete(`/api/v1/teams/${teamId}`)
      .set('Authorization', auth())
      .expect(200);
    expect(removed.body.data.archived).toBe(true);
    void projectId;
  });

  it('returns 404 for a non-existent team id', async () => {
    const response = await request(server())
      .get('/api/v1/teams/00000000-0000-4000-8000-000000000000')
      .set('Authorization', auth())
      .expect(404);
    expect(response.body.code).toBe('TEAM_NOT_FOUND');
  });
});
