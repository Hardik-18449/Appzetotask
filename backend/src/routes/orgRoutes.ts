import { Router } from 'express';
import {
  createOrganization,
  getUserOrganizations,
  addMember,
  removeMember,
  getOrganizationMembers,
} from '../controllers/orgController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createOrgSchema, addMemberSchema } from '../validations';

const router = Router();

router.post('/', authenticate, validateRequest({ body: createOrgSchema }), createOrganization);
router.get('/', authenticate, getUserOrganizations);

router.post(
  '/:id/members',
  authenticate,
  resolveTenant,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest({ body: addMemberSchema }),
  addMember
);

router.delete(
  '/:id/members/:userId',
  authenticate,
  resolveTenant,
  requireRole(['OWNER', 'ADMIN']),
  removeMember
);

router.get('/:id/members', authenticate, resolveTenant, getOrganizationMembers);

export default router;
