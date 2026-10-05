import { Schema, model, Document, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  organizationId: Types.ObjectId;
  senderId?: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: Types.ObjectId;
  entityType?: 'Task' | 'Project' | 'Organization' | 'Comment';
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'TASK_ASSIGNED',
        'MENTION',
        'STATUS_CHANGED',
        'DEADLINE_APPROACHING',
        'ORG_INVITE',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    entityType: {
      type: String,
      enum: ['Task', 'Project', 'Organization', 'Comment'],
      default: 'Task',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// High-speed compound index for real-time notifications feed
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
