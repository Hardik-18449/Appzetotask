import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { addComment, getComments } from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { validateRequest } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
} from '../validations';

const router = Router();

// Apply auth and tenant resolution to all task routes
router.use(authenticate, resolveTenant);

// GET /api/tasks - Advanced search & pagination (all roles can view)
router.get('/', getTasks);

// POST /api/tasks - Create task (OWNER, ADMIN, MEMBER can create; VIEWER cannot)
router.post(
  '/',
  requireRole(['OWNER', 'ADMIN', 'MEMBER']),
  validateRequest({ body: createTaskSchema }),
  createTask
);

// GET /api/tasks/:id - View single task
router.get('/:id', getTaskById);

// PUT /api/tasks/:id - Update task (Server-side RBAC enforced inside controller: OWNER/ADMIN can edit any; MEMBER only assigned)
router.put('/:id', validateRequest({ body: updateTaskSchema }), updateTask);

// DELETE /api/tasks/:id - Delete task (Only OWNER and ADMIN)
router.delete('/:id', requireRole(['OWNER', 'ADMIN']), deleteTask);

// POST /api/tasks/:id/comments - Add comment (OWNER, ADMIN, MEMBER)
router.post(
  '/:id/comments',
  requireRole(['OWNER', 'ADMIN', 'MEMBER']),
  validateRequest({ body: addCommentSchema }),
  addComment
);

// GET /api/tasks/:id/comments - List comments
router.get('/:id/comments', getComments);

export default router;
