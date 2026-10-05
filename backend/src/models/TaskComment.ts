import { Schema, model, Document, Types } from 'mongoose';

export interface ITaskComment extends Document {
  taskId: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const taskCommentSchema = new Schema<ITaskComment>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

taskCommentSchema.index({ taskId: 1, createdAt: 1 });

export const TaskComment = model<ITaskComment>('TaskComment', taskCommentSchema);
