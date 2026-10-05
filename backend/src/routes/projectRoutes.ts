import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import { createProjectSchema } from '../validations';

const router = Router();

// Only OWNER and ADMIN can create projects
router.post(
  '/',
  authenticate,
  resolveTenant,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest({ body: createProjectSchema }),
  createProject
);

// All org roles (OWNER, ADMIN, MEMBER, VIEWER) can view projects
router.get('/', authenticate, resolveTenant, getProjects);
router.get('/:id', authenticate, resolveTenant, getProjectById);

export default router;
