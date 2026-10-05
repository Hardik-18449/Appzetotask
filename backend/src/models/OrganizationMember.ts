import { Schema, model, Document, Types } from 'mongoose';
import { OrgRole } from '../types';

export interface IOrganizationMember extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrgRole;
  joinedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
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
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
      default: 'MEMBER',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate membership in the same organization
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
// Optimize listing organizations a user belongs to
organizationMemberSchema.index({ userId: 1, role: 1 });

export const OrganizationMember = model<IOrganizationMember>('OrganizationMember', organizationMemberSchema);
