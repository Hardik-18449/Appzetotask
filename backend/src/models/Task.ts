import { Schema, model, Document, Types } from 'mongoose';
import { TaskPriority, TaskStatus } from '../types';

export interface IAttachment {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface ITask extends Document {
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: Types.ObjectId | null;
  createdById: Types.ObjectId;
  dueDate?: Date | null;
  labels: string[];
  order: number;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new Schema<ITask>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 250,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 10000,
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'],
      default: 'TODO',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      required: true,
      index: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    labels: {
      type: [String],
      default: [],
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for scale (100k tasks, 10k users, 1k orgs)
// 1. Kanban view column ordering
taskSchema.index({ projectId: 1, status: 1, order: 1 });

// 2. Tenant search & multi-attribute filter
taskSchema.index({ organizationId: 1, status: 1, priority: 1, assigneeId: 1 });

// 3. Deadline tracking
taskSchema.index({ organizationId: 1, dueDate: 1, status: 1 });

// 4. Full-text search for title & description
taskSchema.index({ title: 'text', description: 'text' });

export const Task = model<ITask>('Task', taskSchema);
