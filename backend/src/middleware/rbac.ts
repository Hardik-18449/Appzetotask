import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, OrgRole } from '../types';
import { Task } from '../models/Task';

/**
 * Ensures user has at least one of the required roles in the current organization
 */
export const requireRole = (allowedRoles: OrgRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No organization role determined.' },
      });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is ${req.userRole}.`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Server-side task edit permission check:
 * - OWNER & ADMIN can edit any task
 * - MEMBER can ONLY edit tasks assigned to them
 * - VIEWER cannot edit any task
 */
export const requireTaskEditPermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' },
      });
      return;
    }

    // Ensure task belongs to current tenant organization
    if (task.organizationId.toString() !== req.organizationId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Task does not belong to active organization.' },
      });
      return;
    }

    if (req.userRole === 'OWNER' || req.userRole === 'ADMIN') {
      return next();
    }

    if (req.userRole === 'MEMBER') {
      if (task.assigneeId && task.assigneeId.toString() === req.user?.id) {
        return next();
      }
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Members are only authorized to edit tasks assigned to them.',
        },
      });
      return;
    }

    // VIEWER or unknown
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Viewers have read-only access and cannot edit tasks.',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};
