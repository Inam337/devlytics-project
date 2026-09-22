import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/setup-app';
import { resetDatabase } from './utils/reset-database';

describe('Improvement Engine — Experiments (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherOrgToken: string;
  const stamp = Date.now();

  beforeAll(async () => {
    await resetDatabase();
    app = await createTestApp();

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `experiments${stamp}@example.test`,
        firstName: 'Exp',
        lastName: 'Admin',
        password: 'Str0ng!Passphrase',
        organization: { name: `Experiments Org ${stamp}` },
      });
    token = registered.body.data.accessToken;

    const otherOrg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `other${stamp}@example.test`,
        firstName: 'Other',
        lastName: 'Admin',
        password: 'Str0ng!Passphrase',
        organization: { name: `Other Org ${stamp}` },
      });
    otherOrgToken = otherOrg.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = (t: string = token) => `Bearer ${t}`;

  let experimentId: string;
  let metricId: string;

  it('creates an experiment in DRAFT, defaulting ownership to the creator', async () => {
    const response = await request(server())
      .post('/api/v1/improvements/experiments')
      .set('Authorization', auth())
      .send({
        title: 'Reduce PR Review Time',
        problemStatement: 'Average PR review time increased significantly.',
        hypothesis: 'Reducing PR size will reduce review cycle time.',
        intervention:
          'Encourage smaller PRs and improve reviewer distribution.',
        startDate: '2026-09-01T00:00:00.000Z',
      })
      .expect(201);

    experimentId = response.body.data.id;
    expect(response.body.data.status).toBe('DRAFT');
    expect(response.body.data.userId).toBeTruthy();
  });

  it('rejects an endDate before startDate (400)', async () => {
    const response = await request(server())
      .post('/api/v1/improvements/experiments')
      .set('Authorization', auth())
      .send({
        title: 'Bad date range',
        problemStatement: 'x',
        hypothesis: 'x',
        intervention: 'x',
        startDate: '2026-09-10T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
      })
      .expect(400);
    expect(response.body.code).toBe('INVALID_DATE_RANGE');
  });

  it('rejects completing a DRAFT experiment directly (invalid transition)', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/complete`)
      .set('Authorization', auth())
      .expect(400);
    expect(response.body.code).toBe('INVALID_EXPERIMENT_STATE');
  });

  it('adds a primary metric with an explicit baseline', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/metrics`)
      .set('Authorization', auth())
      .send({
        metricName: 'Review Cycle Time',
        metricKey: 'review_cycle_time',
        metricType: 'DURATION',
        unit: 'hours',
        direction: 'DECREASE',
        baselineValue: 8.4,
        targetValue: 5,
        isPrimary: true,
      })
      .expect(201);

    metricId = response.body.data.id;
    expect(response.body.data.isPrimary).toBe(true);
    expect(response.body.data.currentValue).toBe(8.4);
  });

  it('rejects a second metric reusing the same metricKey (409)', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/metrics`)
      .set('Authorization', auth())
      .send({
        metricName: 'Review Cycle Time (dup)',
        metricKey: 'review_cycle_time',
        metricType: 'DURATION',
        direction: 'DECREASE',
      })
      .expect(409);
    expect(response.body.code).toBe('EXPERIMENT_METRIC_ALREADY_EXISTS');
  });

  it('starts the experiment', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/start`)
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.data.status).toBe('ACTIVE');
  });

  it('reports progress measured against baseline→target, not current/target', async () => {
    const response = await request(server())
      .get(`/api/v1/improvements/experiments/${experimentId}/progress`)
      .set('Authorization', auth())
      .expect(200);

    const metric = response.body.data.metrics.find(
      (m: { metricId: string }) => m.metricId === metricId,
    );
    expect(metric.baseline).toBe(8.4);
    expect(metric.current).toBe(8.4);
    expect(metric.percentComplete).toBe(0); // no movement yet — never (current/target)*100 = 168%
  });

  it('completes the experiment and captures a final measurement (INSUFFICIENT_DATA — no PR activity exists)', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/complete`)
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.data.status).toBe('COMPLETED');
    expect(
      response.body.data.resultSummary.review_cycle_time.insufficientData,
    ).toBe(true);
  });

  it('verifies the experiment and produces an honest INSUFFICIENT_DATA proof rather than a fabricated result', async () => {
    const response = await request(server())
      .post(`/api/v1/improvements/experiments/${experimentId}/verify`)
      .set('Authorization', auth())
      .expect(200);

    expect(response.body.data.verificationStatus).toBe('INSUFFICIENT_DATA');
    expect(response.body.data.confidence).toBe('INSUFFICIENT_DATA');
    expect(response.body.data.targetAchieved).toBe(false);
  });

  it('moves the experiment to FAILED once verification does not achieve the target', async () => {
    const response = await request(server())
      .get(`/api/v1/improvements/experiments/${experimentId}`)
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.data.status).toBe('FAILED');
  });

  it('retrieves the proof directly', async () => {
    const response = await request(server())
      .get(`/api/v1/improvements/experiments/${experimentId}/proof`)
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.data.experimentId).toBe(experimentId);
  });

  it('lists the experiment in history', async () => {
    const response = await request(server())
      .get('/api/v1/improvements/history')
      .set('Authorization', auth())
      .expect(200);
    expect(
      response.body.data.some((row: { id: string }) => row.id === experimentId),
    ).toBe(true);
  });

  it('surfaces the verified experiment in the dashboard trend', async () => {
    const response = await request(server())
      .get('/api/v1/improvements/dashboard')
      .set('Authorization', auth())
      .expect(200);
    expect(response.body.data.recentProofs[0].experimentId).toBe(experimentId);
  });

  it('refuses to delete a completed/verified experiment (409)', async () => {
    const response = await request(server())
      .delete(`/api/v1/improvements/experiments/${experimentId}`)
      .set('Authorization', auth())
      .expect(409);
    expect(response.body.code).toBe('INVALID_EXPERIMENT_STATE');
  });

  it("never lets one organization read another organization's experiment", async () => {
    const response = await request(server())
      .get(`/api/v1/improvements/experiments/${experimentId}`)
      .set('Authorization', auth(otherOrgToken))
      .expect(404);
    expect(response.body.code).toBe('EXPERIMENT_NOT_FOUND');
  });

  it('rejects unauthenticated requests (401)', async () => {
    await request(server()).get('/api/v1/improvements/experiments').expect(401);
  });
});
