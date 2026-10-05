import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Organization } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { notifyAddedToOrganization } from '../services/notificationService';

export const createOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    // Generate unique slug
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const org = await Organization.create({
      name,
      slug,
      ownerId: userId,
    });

    // Add creator as OWNER
    await OrganizationMember.create({
      organizationId: org._id,
      userId,
      role: 'OWNER',
    });

    // Record audit log
    await logAuditEvent({
      user: userId,
      organization: org._id,
      action: 'ORGANIZATION_CREATED',
      entity: 'Organization',
      entityId: org._id as Types.ObjectId,
      oldValue: null,
      newValue: { name: org.name, slug: org.slug },
    });

    res.status(201).json({
      success: true,
      data: {
        organization: org,
        role: 'OWNER',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrganizations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const memberships = await OrganizationMember.find({ userId })
      .populate('organizationId', 'name slug ownerId createdAt')
      .lean();

    const organizations = memberships
      .filter((m) => m.organizationId)
      .map((m: any) => ({
        ...m.organizationId,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.id;
    const { email, userId: targetUserId, role = 'MEMBER' } = req.body;
    const currentUserId = req.user!.id;

    // Resolve user either by userId or email
    let userToAdd;
    if (targetUserId) {
      userToAdd = await User.findById(targetUserId);
    } else if (email) {
      userToAdd = await User.findOne({ email: email.toLowerCase() });
    }

    if (!userToAdd) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User to add was not found.' },
      });
      return;
    }

    // Check if user is already a member
    const existing = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: userToAdd._id,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'MEMBER_EXISTS', message: 'User is already a member of this organization.' },
      });
      return;
    }

    const newMember = await OrganizationMember.create({
      organizationId: orgId,
      userId: userToAdd._id,
      role,
    });

    const org = await Organization.findById(orgId).select('name');

    // Audit log
    await logAuditEvent({
      user: currentUserId,
      organization: orgId,
      action: 'MEMBER_ADDED',
      entity: 'Member',
      entityId: userToAdd._id as Types.ObjectId,
      oldValue: null,
      newValue: { userId: userToAdd._id, email: userToAdd.email, role },
    });

    // Send real-time notification to the invited user
    if (org) {
      await notifyAddedToOrganization(
        orgId,
        org.name,
        userToAdd._id,
        { id: currentUserId, name: req.user!.name }
      );
    }

    res.status(201).json({
      success: true,
      data: {
        member: {
          id: newMember._id,
          user: {
            id: userToAdd._id,
            name: userToAdd.name,
            email: userToAdd.email,
            avatarUrl: userToAdd.avatarUrl,
          },
          role: newMember.role,
          joinedAt: newMember.joinedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.id;
    const targetUserId = req.params.userId;
    const currentUserId = req.user!.id;

    const membership = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: targetUserId,
    });

    if (!membership) {
      res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Membership record not found.' },
      });
      return;
    }

    // Prevent removing organization OWNER
    if (membership.role === 'OWNER') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot remove organization OWNER.' },
      });
      return;
    }

    await OrganizationMember.deleteOne({ _id: membership._id });

    // Record audit log
    await logAuditEvent({
      user: currentUserId,
      organization: orgId,
      action: 'MEMBER_REMOVED',
      entity: 'Member',
      entityId: new Types.ObjectId(targetUserId),
      oldValue: { userId: targetUserId, role: membership.role },
      newValue: null,
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.id;

    const members = await OrganizationMember.find({ organizationId: orgId })
      .populate('userId', 'name email avatarUrl')
      .lean();

    const formatted = members.map((m: any) => ({
      id: m._id,
      user: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};
