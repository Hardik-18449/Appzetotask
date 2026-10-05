import { Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from '../types';

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.organizationId!;
    const userRole = req.userRole!;

    // Only OWNER and ADMIN are authorized to view audit logs
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ADMIN and OWNER can view audit logs.' },
      });
      return;
    }

    const {
      entity,
      action,
      userId,
      entityId,
      from,
      to,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const query: Record<string, any> = { organization: organizationId };

    if (entity) {
      query.entity = entity;
    }

    if (action) {
      query.action = new RegExp(action, 'i');
    }

    if (userId) {
      query.user = userId;
    }

    if (entityId) {
      query.entityId = entityId;
    }

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email avatarUrl')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};
