import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  organizationId: Types.ObjectId;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ organizationId: 1, createdAt: -1 });

export const Project = model<IProject>('Project', projectSchema);
