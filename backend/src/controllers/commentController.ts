import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Task } from '../models/Task';
import { TaskComment } from '../models/TaskComment';
import { AuthenticatedRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { notifyCommentMentions } from '../services/notificationService';
import { emitToProject } from '../services/socketService';

export const addComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { content } = req.body;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const userName = req.user!.name;

    const task = await Task.findOne({ _id: taskId, organizationId });
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' },
      });
      return;
    }

    // Parse mentions and send notifications
    const mentionedUserIds = await notifyCommentMentions(
      content,
      task._id as Types.ObjectId,
      task.title,
      organizationId,
      { id: userId, name: userName }
    );

    const comment = await TaskComment.create({
      taskId: task._id,
      organizationId,
      userId,
      content,
      mentions: mentionedUserIds,
    });

    const populatedComment = await TaskComment.findById(comment._id)
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .lean();

    // Record audit log
    await logAuditEvent({
      user: userId,
      organization: organizationId,
      action: 'COMMENT_ADDED',
      entity: 'Comment',
      entityId: comment._id as Types.ObjectId,
      oldValue: null,
      newValue: { taskId: task._id, contentSnippet: content.slice(0, 100) },
    });

    // Real-time broadcast to project room
    emitToProject(task.projectId.toString(), 'comment:added', {
      taskId: task._id,
      comment: populatedComment,
      actor: { id: userId, name: userName },
    });

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = req.params.id;
    const organizationId = req.organizationId!;

    const comments = await TaskComment.find({ taskId, organizationId })
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};
