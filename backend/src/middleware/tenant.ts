import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, OrgRole } from '../types';
import { OrganizationMember } from '../models/OrganizationMember';
import { Organization } from '../models/Organization';

export const resolveTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    // Attempt to extract organization ID from header, query, or params
    let orgId =
      (req.headers['x-organization-id'] as string) ||
      (req.query.organizationId as string) ||
      (req.params.organizationId as string);

    // If route matches /organizations/:id, extract from param id
    if (!orgId && req.baseUrl.includes('organizations') && req.params.id) {
      orgId = req.params.id;
    }

    if (!orgId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'Organization ID is required via header (x-organization-id) or query parameter.',
        },
      });
      return;
    }

    if (!Types.ObjectId.isValid(orgId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ORG_ID', message: 'Provided organization ID is not valid.' },
      });
      return;
    }

    // Verify organization exists
    const org = await Organization.findById(orgId).select('_id name ownerId');
    if (!org) {
      res.status(404).json({
        success: false,
        error: { code: 'ORG_NOT_FOUND', message: 'Organization does not exist.' },
      });
      return;
    }

    // Check membership
    const membership = await OrganizationMember.findOne({
      organizationId: org._id,
      userId: req.user.id,
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NOT_ORG_MEMBER',
          message: 'You are not a member of this organization.',
        },
      });
      return;
    }

    req.organizationId = org._id.toString();
    req.userRole = membership.role as OrgRole;

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};
