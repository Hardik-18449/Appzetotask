export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface IUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  role: OrgRole;
  joinedAt?: string;
}

export interface IProject {
  _id: string;
  organizationId: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdById: IUser;
  createdAt: string;
}

export interface IAttachment {
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

export interface ITask {
  _id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: IUser | null;
  createdById: IUser;
  dueDate?: string | null;
  labels: string[];
  order: number;
  attachments: IAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface ITaskComment {
  _id: string;
  taskId: string;
  organizationId: string;
  userId: IUser;
  content: string;
  mentions: IUser[];
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  user: IUser;
  organization: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  timestamp: string;
}

export interface INotification {
  _id: string;
  recipientId: string;
  organizationId: string;
  senderId?: IUser | null;
  type: 'TASK_ASSIGNED' | 'MENTION' | 'STATUS_CHANGED' | 'DEADLINE_APPROACHING' | 'ORG_INVITE';
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}
