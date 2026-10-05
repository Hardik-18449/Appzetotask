import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  user: Types.ObjectId;
  organization: Types.ObjectId;
  action: string;
  entity: 'Task' | 'Project' | 'Organization' | 'Member' | 'Comment';
  entityId: Types.ObjectId;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entity: {
      type: String,
      enum: ['Task', 'Project', 'Organization', 'Member', 'Comment'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// High-performance compound indexes for audit filtering and timeline sorting
auditLogSchema.index({ organization: 1, timestamp: -1 });
auditLogSchema.index({ organization: 1, entity: 1, action: 1 });
auditLogSchema.index({ entityId: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
