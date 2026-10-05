import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Only OWNER and ADMIN can access audit logs
router.get('/', authenticate, resolveTenant, requireRole(['OWNER', 'ADMIN']), getAuditLogs);

export default router;
