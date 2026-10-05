import { Router } from 'express';
import authRoutes from './authRoutes';
import orgRoutes from './orgRoutes';
import projectRoutes from './projectRoutes';
import taskRoutes from './taskRoutes';
import auditRoutes from './auditRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', orgRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
