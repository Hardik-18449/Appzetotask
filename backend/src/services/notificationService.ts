import { Types } from 'mongoose';
import { Notification, INotification } from '../models/Notification';
import { Task, ITask } from '../models/Task';
import { User, IUser } from '../models/User';
import { emitToUser } from './socketService';
import { NotificationType } from '../types';

export interface CreateNotificationParams {
  recipientId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
  senderId?: string | Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string | Types.ObjectId | null;
  entityType?: 'Task' | 'Project' | 'Organization' | 'Comment';
}

export const createNotification = async (
  params: CreateNotificationParams
): Promise<INotification | null> => {
  try {
    // Avoid sending notification to oneself
    if (params.senderId && params.recipientId.toString() === params.senderId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipientId: params.recipientId,
      organizationId: params.organizationId,
      senderId: params.senderId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      entityId: params.entityId || null,
      entityType: params.entityType || 'Task',
      isRead: false,
    });

    const populated = await Notification.findById(notification._id)
      .populate('senderId', 'name email avatarUrl')
      .lean();

    // Push live event via Socket.IO
    emitToUser(params.recipientId.toString(), 'notification:new', populated);

    return notification;
  } catch (error: any) {
    console.error('[NotificationService] Failed to create notification:', error.message);
    return null;
  }
};

/**
 * 1. Notify user when assigned a task
 */
export const notifyTaskAssigned = async (
  task: ITask,
  actor: { id: string; name: string }
): Promise<void> => {
  if (!task.assigneeId) return;

  await createNotification({
    recipientId: task.assigneeId,
    organizationId: task.organizationId,
    senderId: actor.id,
    type: 'TASK_ASSIGNED',
    title: 'New Task Assignment',
    message: `${actor.name} assigned you to task "${task.title}"`,
    entityId: task._id as Types.ObjectId,
    entityType: 'Task',
  });
};

/**
 * 2. Notify users when mentioned in a comment
 */
export const notifyCommentMentions = async (
  commentContent: string,
  taskId: string | Types.ObjectId,
  taskTitle: string,
  organizationId: string | Types.ObjectId,
  actor: { id: string; name: string }
): Promise<Types.ObjectId[]> => {
  // Parse @username or @email patterns
  const mentionMatches = commentContent.match(/@([a-zA-Z0-9._-]+)/g);
  if (!mentionMatches) return [];

  const usernames = mentionMatches.map((m) => m.slice(1).toLowerCase());
  
  // Find users by name or email username
  const mentionedUsers = await User.find({
    $or: [
      { email: { $in: usernames.map((u) => new RegExp(`^${u}@`, 'i')) } },
      { name: { $in: usernames.map((u) => new RegExp(`^${u}`, 'i')) } },
    ],
  }).select('_id name');

  const mentionedIds: Types.ObjectId[] = [];

  for (const user of mentionedUsers) {
    mentionedIds.push(user._id as Types.ObjectId);
    await createNotification({
      recipientId: user._id as Types.ObjectId,
      organizationId,
      senderId: actor.id,
      type: 'MENTION',
      title: 'Mentioned in a Comment',
      message: `${actor.name} mentioned you in task "${taskTitle}"`,
      entityId: taskId,
      entityType: 'Comment',
    });
  }

  return mentionedIds;
};

/**
 * 3. Notify users when task status changes (to assignee & creator)
 */
export const notifyTaskStatusChanged = async (
  task: ITask,
  oldStatus: string,
  newStatus: string,
  actor: { id: string; name: string }
): Promise<void> => {
  const recipients = new Set<string>();

  if (task.assigneeId) recipients.add(task.assigneeId.toString());
  if (task.createdById) recipients.add(task.createdById.toString());

  // Remove the actor themselves
  recipients.delete(actor.id);

  for (const recipientId of recipients) {
    await createNotification({
      recipientId,
      organizationId: task.organizationId,
      senderId: actor.id,
      type: 'STATUS_CHANGED',
      title: 'Task Status Updated',
      message: `${actor.name} changed status of "${task.title}" from ${oldStatus} to ${newStatus}`,
      entityId: task._id as Types.ObjectId,
      entityType: 'Task',
    });
  }
};

/**
 * 4. Notify users when added to an organization
 */
export const notifyAddedToOrganization = async (
  organizationId: string | Types.ObjectId,
  orgName: string,
  newMemberId: string | Types.ObjectId,
  actor: { id: string; name: string }
): Promise<void> => {
  await createNotification({
    recipientId: newMemberId,
    organizationId,
    senderId: actor.id,
    type: 'ORG_INVITE',
    title: 'Added to Organization',
    message: `${actor.name} added you to ${orgName}`,
    entityId: organizationId,
    entityType: 'Organization',
  });
};

/**
 * 5. Notify users when a deadline is approaching (within 24 hours)
 */
export const checkApproachingDeadlines = async (): Promise<void> => {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingTasks = await Task.find({
      dueDate: { $gte: now, $lte: in24Hours },
      status: { $ne: 'DONE' },
      assigneeId: { $ne: null },
    }).select('_id title dueDate assigneeId organizationId');

    for (const task of upcomingTasks) {
      if (!task.assigneeId) continue;

      // Check if a deadline notification was already sent in the last 24h
      const existing = await Notification.findOne({
        recipientId: task.assigneeId,
        entityId: task._id,
        type: 'DEADLINE_APPROACHING',
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      });

      if (!existing) {
        await createNotification({
          recipientId: task.assigneeId,
          organizationId: task.organizationId,
          senderId: null,
          type: 'DEADLINE_APPROACHING',
          title: 'Upcoming Deadline Alert',
          message: `Task "${task.title}" is due soon (${task.dueDate?.toLocaleDateString()})`,
          entityId: task._id as Types.ObjectId,
          entityType: 'Task',
        });
      }
    }
  } catch (error: any) {
    console.error('[NotificationService] Error checking deadlines:', error.message);
  }
};
