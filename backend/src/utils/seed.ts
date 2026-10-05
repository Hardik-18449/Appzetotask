import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { TaskComment } from '../models/TaskComment';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';

export const seedDatabase = async (skipConnectDisconnect = false) => {
  try {
    if (!skipConnectDisconnect) {
      await connectDB();
    }
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      OrganizationMember.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      TaskComment.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seed] Seeding Users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const users = await User.create([
      {
        name: 'Alice Johnson',
        email: 'alice@enterprise.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      {
        name: 'Bob Smith',
        email: 'bob@enterprise.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      },
      {
        name: 'Charlie Davis',
        email: 'charlie@enterprise.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      },
      {
        name: 'Dave Wilson',
        email: 'dave@enterprise.com',
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
      },
    ]);

    const [alice, bob, charlie, dave] = users;

    console.log('[Seed] Creating Organizations & Memberships...');
    const orgAcme = await Organization.create({
      name: 'Acme Technologies',
      slug: 'acme-tech',
      ownerId: alice._id,
    });

    const orgStarlight = await Organization.create({
      name: 'Starlight Labs',
      slug: 'starlight-labs',
      ownerId: bob._id,
    });

    // Acme Memberships: Alice (OWNER), Bob (ADMIN), Charlie (MEMBER), Dave (VIEWER)
    await OrganizationMember.create([
      { organizationId: orgAcme._id, userId: alice._id, role: 'OWNER' },
      { organizationId: orgAcme._id, userId: bob._id, role: 'ADMIN' },
      { organizationId: orgAcme._id, userId: charlie._id, role: 'MEMBER' },
      { organizationId: orgAcme._id, userId: dave._id, role: 'VIEWER' },
      // Starlight Memberships: Bob (OWNER), Alice (ADMIN)
      { organizationId: orgStarlight._id, userId: bob._id, role: 'OWNER' },
      { organizationId: orgStarlight._id, userId: alice._id, role: 'ADMIN' },
    ]);

    console.log('[Seed] Creating Projects...');
    const project1 = await Project.create({
      organizationId: orgAcme._id,
      name: 'Core Platform V2 Migration',
      description: 'Migrating legacy monolith to multi-tenant distributed micro-services.',
      createdById: alice._id,
    });

    const project2 = await Project.create({
      organizationId: orgAcme._id,
      name: 'Real-Time Sync Engine',
      description: 'WebSockets and event-driven pipeline for instant updates.',
      createdById: bob._id,
    });

    console.log('[Seed] Creating Tasks across Kanban columns...');
    const tasks = await Task.create([
      {
        organizationId: orgAcme._id,
        projectId: project1._id,
        title: 'Design Multi-Tenant Database Schema',
        description: 'Establish compound indexing strategy for 100k tasks, 10k users, and 1k orgs.',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: charlie._id,
        createdById: alice._id,
        dueDate: new Date(Date.now() + 2 * 86400000),
        labels: ['database', 'architecture'],
        order: 0,
      },
      {
        organizationId: orgAcme._id,
        projectId: project1._id,
        title: 'Implement Server-Side RBAC Enforcement',
        description: 'Strict middleware validation preventing unauthorized resource modification.',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        assigneeId: charlie._id,
        createdById: alice._id,
        dueDate: new Date(Date.now() + 1 * 86400000),
        labels: ['security', 'auth'],
        order: 0,
      },
      {
        organizationId: orgAcme._id,
        projectId: project1._id,
        title: 'Build Drag & Drop Kanban UI',
        description: 'Interactive columns with state persistence and optimistic updates.',
        status: 'TODO',
        priority: 'HIGH',
        assigneeId: bob._id,
        createdById: alice._id,
        dueDate: new Date(Date.now() + 4 * 86400000),
        labels: ['frontend', 'react'],
        order: 0,
      },
      {
        organizationId: orgAcme._id,
        projectId: project1._id,
        title: 'Audit Logging & Search Engine',
        description: 'Filterable audit logs tracking oldValue vs newValue on all entity mutations.',
        status: 'REVIEW',
        priority: 'MEDIUM',
        assigneeId: alice._id,
        createdById: bob._id,
        dueDate: new Date(Date.now() + 3 * 86400000),
        labels: ['audit', 'search'],
        order: 0,
      },
    ]);

    console.log('[Seed] Adding Comments...');
    await TaskComment.create({
      taskId: tasks[1]._id,
      organizationId: orgAcme._id,
      userId: alice._id,
      content: 'Hey @charlie, please make sure members can only edit tasks assigned to them!',
      mentions: [charlie._id],
    });

    console.log('[Seed] Adding Initial Audit Logs...');
    await AuditLog.create([
      {
        user: alice._id,
        organization: orgAcme._id,
        action: 'PROJECT_CREATED',
        entity: 'Project',
        entityId: project1._id,
        oldValue: null,
        newValue: { name: project1.name },
        timestamp: new Date(),
      },
      {
        user: alice._id,
        organization: orgAcme._id,
        action: 'TASK_CREATED',
        entity: 'Task',
        entityId: tasks[1]._id,
        oldValue: null,
        newValue: { title: tasks[1].title, status: tasks[1].status },
        timestamp: new Date(),
      },
    ]);

    console.log('[Seed] Adding Notification...');
    await Notification.create({
      recipientId: charlie._id,
      organizationId: orgAcme._id,
      senderId: alice._id,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assignment',
      message: 'Alice Johnson assigned you to task "Implement Server-Side RBAC Enforcement"',
      entityId: tasks[1]._id,
      entityType: 'Task',
      isRead: false,
    });

    console.log('=======================================================');
    console.log('  Database seeded successfully!');
    console.log('  Demo Logins (Password for all: password123):');
    console.log('  - OWNER:   alice@enterprise.com');
    console.log('  - ADMIN:   bob@enterprise.com');
    console.log('  - MEMBER:  charlie@enterprise.com');
    console.log('  - VIEWER:  dave@enterprise.com');
    console.log('=======================================================');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
  } finally {
    if (!skipConnectDisconnect) {
      await disconnectDB();
    }
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}
