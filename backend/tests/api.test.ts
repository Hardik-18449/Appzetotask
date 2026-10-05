import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';

let mongoServer: MongoMemoryServer;
let app: any;

jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Task 2: Multi-Tenant Project Management & Collaboration APIs', () => {
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let ownerId: string;
  let memberId: string;
  let viewerId: string;
  let orgId: string;
  let projectId: string;
  let taskId: string;

  // 1. Authentication
  it('should register users with different roles', async () => {
    // Register Owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Owner', email: 'owner@test.com', password: 'password123' });
    expect(ownerRes.status).toBe(201);
    expect(ownerRes.body.data.token).toBeDefined();
    ownerToken = ownerRes.body.data.token;
    ownerId = ownerRes.body.data.user.id;

    // Register Member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob Member', email: 'member@test.com', password: 'password123' });
    expect(memberRes.status).toBe(201);
    memberToken = memberRes.body.data.token;
    memberId = memberRes.body.data.user.id;

    // Register Viewer
    const viewerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Charlie Viewer', email: 'viewer@test.com', password: 'password123' });
    expect(viewerRes.status).toBe(201);
    viewerToken = viewerRes.body.data.token;
    viewerId = viewerRes.body.data.user.id;
  });

  // 2. Organization Management
  it('should create an organization and set creator as OWNER', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Apex Innovators' });

    expect(res.status).toBe(201);
    expect(res.body.data.organization._id).toBeDefined();
    expect(res.body.data.role).toBe('OWNER');
    orgId = res.body.data.organization._id;
  });

  it('should add members with specific roles (MEMBER, VIEWER)', async () => {
    // Add Member
    const addMemberRes = await request(app)
      .post(`/api/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ userId: memberId, role: 'MEMBER' });
    expect(addMemberRes.status).toBe(201);
    expect(addMemberRes.body.data.member.role).toBe('MEMBER');

    // Add Viewer
    const addViewerRes = await request(app)
      .post(`/api/organizations/${orgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ userId: viewerId, role: 'VIEWER' });
    expect(addViewerRes.status).toBe(201);
    expect(addViewerRes.body.data.member.role).toBe('VIEWER');
  });

  // 3. Project Management
  it('should allow OWNER to create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ name: 'Platform Migration', description: 'Next-gen architecture' });

    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeDefined();
    projectId = res.body.data._id;
  });

  it('should reject project creation from MEMBER or VIEWER', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', orgId)
      .send({ name: 'Unauthorized Project' });

    expect(res.status).toBe(403);
  });

  // 4. Tasks & Server-side RBAC
  it('should allow MEMBER to create a task assigned to them', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', orgId)
      .send({
        projectId,
        title: 'Implement OAuth Flow',
        description: 'Set up JWT and refresh token cookies',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: memberId,
        labels: ['auth', 'security'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.title).toBe('Implement OAuth Flow');
    taskId = res.body.data._id;
  });

  it('should reject task creation from VIEWER', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', orgId)
      .send({
        projectId,
        title: 'Viewer Task Attempt',
      });

    expect(res.status).toBe(403);
  });

  it('should allow MEMBER to update their assigned task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', orgId)
      .send({
        status: 'IN_PROGRESS',
        priority: 'URGENT',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.priority).toBe('URGENT');
  });

  it('should REJECT MEMBER from editing task assigned to someone else', async () => {
    // Create task assigned to OWNER
    const ownerTaskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({
        projectId,
        title: 'Owner Secret Strategy',
        assigneeId: ownerId,
      });

    const ownerTaskId = ownerTaskRes.body.data._id;

    // Member attempts to edit owner's task
    const forbiddenRes = await request(app)
      .put(`/api/tasks/${ownerTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', orgId)
      .send({ status: 'DONE' });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
  });

  // 5. Advanced Search & Filtering
  it('should support combined filtering on tasks', async () => {
    const res = await request(app)
      .get(`/api/tasks?projectId=${projectId}&status=IN_PROGRESS&priority=URGENT`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].status).toBe('IN_PROGRESS');
    expect(res.body.pagination).toBeDefined();
  });

  // 6. Comments & Audit Logs
  it('should allow adding comment with mentions', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId)
      .send({ content: 'Great progress @Bob, almost there!' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toContain('@Bob');
  });

  it('should allow OWNER to retrieve audit logs with recorded state changes', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const statusChangeLog = res.body.data.find(
      (log: any) => log.action === 'TASK_STATUS_CHANGED' || log.action === 'TASK_PRIORITY_CHANGED'
    );
    expect(statusChangeLog).toBeDefined();
    expect(statusChangeLog.oldValue).toBeDefined();
    expect(statusChangeLog.newValue).toBeDefined();
  });

  it('should forbid VIEWER or MEMBER from viewing audit logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(403);
  });
});
