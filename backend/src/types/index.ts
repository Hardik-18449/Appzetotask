import { Request } from 'express';
import { Types } from 'mongoose';

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'MENTION'
  | 'STATUS_CHANGED'
  | 'DEADLINE_APPROACHING'
  | 'ORG_INVITE';

export interface IUserPayload {
  id: string;
  email: string;
  name: string;
}

export interface IOrgMembershipPayload {
  organizationId: string;
  role: OrgRole;
}

export interface AuthenticatedRequest extends Request {
  user?: IUserPayload;
  organizationId?: string;
  userRole?: OrgRole;
}
