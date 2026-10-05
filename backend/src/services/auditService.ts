import { Types } from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';

export interface CreateAuditLogParams {
  user: string | Types.ObjectId;
  organization: string | Types.ObjectId;
  action: string;
  entity: 'Task' | 'Project' | 'Organization' | 'Member' | 'Comment';
  entityId: string | Types.ObjectId;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
}

export const logAuditEvent = async (params: CreateAuditLogParams): Promise<IAuditLog> => {
  try {
    const entry = await AuditLog.create({
      user: params.user,
      organization: params.organization,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      timestamp: new Date(),
    });

    return entry;
  } catch (error: any) {
    console.error('[AuditService] Failed to write audit log entry:', error.message);
    throw error;
  }
};
