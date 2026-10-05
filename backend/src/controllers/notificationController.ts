import { Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest } from '../types';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { unreadOnly, page = '1', limit = '30' } = req.query as Record<string, string>;

    const query: Record<string, any> = { recipientId: userId };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('senderId', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
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

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
