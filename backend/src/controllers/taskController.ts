import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Task } from '../models/Task';
import { AuthenticatedRequest, TaskStatus, TaskPriority } from '../types';
import { logAuditEvent } from '../services/auditService';
import { notifyTaskAssigned, notifyTaskStatusChanged } from '../services/notificationService';
import { emitToProject } from '../services/socketService';

/**
 * POST /api/tasks
 * Create task in active organization and specified project
 */
export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      projectId,
      title,
      description,
      status = 'TODO',
      priority = 'MEDIUM',
      assigneeId,
      dueDate,
      labels = [],
      attachments = [],
    } = req.body;

    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    // Determine current highest order in that column
    const highestTask = await Task.findOne({ projectId, status })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const order = highestTask ? highestTask.order + 1 : 0;

    const task = await Task.create({
      organizationId,
      projectId,
      title,
      description: description || '',
      status,
      priority,
      assigneeId: assigneeId || null,
      createdById: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: Array.isArray(labels) ? labels : [],
      order,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdById', 'name email avatarUrl')
      .lean();

    // 1. Audit Log
    await logAuditEvent({
      user: userId,
      organization: organizationId,
      action: 'TASK_CREATED',
      entity: 'Task',
      entityId: task._id as Types.ObjectId,
      oldValue: null,
      newValue: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
      },
    });

    // 2. Real-time notification if assigned
    if (task.assigneeId) {
      await notifyTaskAssigned(task, { id: userId, name: req.user!.name });
    }

    // 3. Socket.IO live broadcast to project room
    emitToProject(projectId.toString(), 'task:created', {
      task: populatedTask,
      actor: { id: userId, name: req.user!.name },
    });

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks
 * Advanced Search & Filtering supporting:
 * - status, priority, assignee, labels, dueDate (comparisons), createdDate, full-text search
 * - pagination (page, limit)
 */
export const getTasks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.organizationId!;
    const {
      projectId,
      status,
      priority,
      assignee,
      labels,
      dueDate,
      dueDateBefore,
      dueDateAfter,
      createdBefore,
      createdAfter,
      q, // Text search query
      page = '1',
      limit = '50',
      sortBy = 'order',
      sortOrder = 'asc',
    } = req.query as Record<string, string>;

    const query: Record<string, any> = { organizationId };

    if (projectId) {
      query.projectId = projectId;
    }

    // Filter by status (single or comma-separated)
    if (status) {
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      query.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    // Filter by priority
    if (priority) {
      const priorities = priority.split(',').map((p) => p.trim().toUpperCase());
      query.priority = priorities.length > 1 ? { $in: priorities } : priorities[0];
    }

    // Filter by assignee
    if (assignee) {
      if (assignee === 'unassigned') {
        query.assigneeId = null;
      } else {
        query.assigneeId = assignee;
      }
    }

    // Filter by labels (comma-separated or single)
    if (labels) {
      const labelArray = labels.split(',').map((l) => l.trim());
      query.labels = { $in: labelArray };
    }

    // Due Date filters (supports exact, < date, > date)
    if (dueDate) {
      // Check for < or > prefix, e.g. dueDate<2026-09-01
      if (dueDate.startsWith('<')) {
        query.dueDate = { $lt: new Date(dueDate.slice(1)) };
      } else if (dueDate.startsWith('>')) {
        query.dueDate = { $gt: new Date(dueDate.slice(1)) };
      } else {
        const startOfDay = new Date(dueDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    if (dueDateBefore) {
      query.dueDate = { ...query.dueDate, $lte: new Date(dueDateBefore) };
    }

    if (dueDateAfter) {
      query.dueDate = { ...query.dueDate, $gte: new Date(dueDateAfter) };
    }

    // Created Date filters
    if (createdBefore || createdAfter) {
      query.createdAt = {};
      if (createdBefore) query.createdAt.$lte = new Date(createdBefore);
      if (createdAfter) query.createdAt.$gte = new Date(createdAfter);
    }

    // Full-text search
    if (q && q.trim().length > 0) {
      query.$text = { $search: q.trim() };
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNumber - 1) * limitNumber;

    const sortObj: Record<string, 1 | -1> = {};
    const direction = sortOrder.toLowerCase() === 'desc' ? -1 : 1;
    sortObj[sortBy || 'order'] = direction;

    // Avoid N+1 queries by selecting only required fields and batch populating
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assigneeId', 'name email avatarUrl')
        .populate('createdById', 'name email avatarUrl')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 */
export const getTaskById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId!;

    const task = await Task.findOne({ _id: id, organizationId })
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdById', 'name email avatarUrl')
      .lean();

    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tasks/:id
 * Server-side RBAC enforced:
 * - OWNER/ADMIN can update any task
 * - MEMBER can only update assigned tasks
 * - Changes are persisted, audited (oldValue vs newValue), and broadcasted via WebSockets
 */
export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const userRole = req.userRole!;

    const task = await Task.findOne({ _id: id, organizationId });
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' },
      });
      return;
    }

    // SERVER-SIDE AUTHORIZATION CHECK
    if (userRole === 'VIEWER') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Viewers have read-only access.' },
      });
      return;
    }

    if (userRole === 'MEMBER') {
      const isAssigned = task.assigneeId && task.assigneeId.toString() === userId;
      if (!isAssigned) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Members can only update tasks assigned to them.',
          },
        });
        return;
      }
    }

    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      labels,
      order,
      attachments,
    } = req.body;

    const previousStatus = task.status;
    const previousPriority = task.priority;
    const previousAssigneeId = task.assigneeId ? task.assigneeId.toString() : null;

    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    if (title !== undefined && title !== task.title) {
      oldValue.title = task.title;
      newValue.title = title;
      task.title = title;
    }

    if (description !== undefined && description !== task.description) {
      oldValue.description = task.description;
      newValue.description = description;
      task.description = description;
    }

    if (status !== undefined && status !== task.status) {
      oldValue.status = task.status;
      newValue.status = status;
      task.status = status;
    }

    if (priority !== undefined && priority !== task.priority) {
      oldValue.priority = task.priority;
      newValue.priority = priority;
      task.priority = priority;
    }

    if (assigneeId !== undefined) {
      const formattedAssignee = assigneeId ? assigneeId.toString() : null;
      if (formattedAssignee !== previousAssigneeId) {
        oldValue.assigneeId = previousAssigneeId;
        newValue.assigneeId = formattedAssignee;
        task.assigneeId = formattedAssignee ? new Types.ObjectId(formattedAssignee) : null;
      }
    }

    if (dueDate !== undefined) {
      const parsedDate = dueDate ? new Date(dueDate) : null;
      oldValue.dueDate = task.dueDate;
      newValue.dueDate = parsedDate;
      task.dueDate = parsedDate;
    }

    if (labels !== undefined) {
      oldValue.labels = task.labels;
      newValue.labels = labels;
      task.labels = labels;
    }

    if (order !== undefined) {
      task.order = order;
    }

    if (attachments !== undefined) {
      task.attachments = attachments;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdById', 'name email avatarUrl')
      .lean();

    // 1. Audit Log (if any tracked changes occurred)
    if (Object.keys(newValue).length > 0) {
      let action = 'TASK_UPDATED';
      if (newValue.status) action = 'TASK_STATUS_CHANGED';
      else if (newValue.assigneeId !== undefined) action = 'TASK_ASSIGNMENT_CHANGED';
      else if (newValue.priority) action = 'TASK_PRIORITY_CHANGED';

      await logAuditEvent({
        user: userId,
        organization: organizationId,
        action,
        entity: 'Task',
        entityId: task._id as Types.ObjectId,
        oldValue,
        newValue,
      });
    }

    // 2. Notifications
    // Status change notification
    if (newValue.status && newValue.status !== previousStatus) {
      await notifyTaskStatusChanged(task, previousStatus, newValue.status, {
        id: userId,
        name: req.user!.name,
      });
    }

    // New assignee notification
    if (
      newValue.assigneeId &&
      newValue.assigneeId !== previousAssigneeId &&
      newValue.assigneeId !== userId
    ) {
      await notifyTaskAssigned(task, { id: userId, name: req.user!.name });
    }

    // 3. Socket.IO live broadcast to everyone viewing this project's board
    emitToProject(task.projectId.toString(), 'task:updated', {
      task: populatedTask,
      actor: { id: userId, name: req.user!.name },
    });

    res.status(200).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Server-side RBAC: Only ADMIN & OWNER can delete tasks
 */
export const deleteTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;
    const userRole = req.userRole!;

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ADMIN and OWNER can delete tasks.' },
      });
      return;
    }

    const task = await Task.findOne({ _id: id, organizationId });
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' },
      });
      return;
    }

    const projectId = task.projectId.toString();
    const taskTitle = task.title;

    await Task.deleteOne({ _id: task._id });

    // Record audit log
    await logAuditEvent({
      user: userId,
      organization: organizationId,
      action: 'TASK_DELETED',
      entity: 'Task',
      entityId: task._id as Types.ObjectId,
      oldValue: { title: taskTitle, status: task.status },
      newValue: null,
    });

    // Real-time broadcast
    emitToProject(projectId, 'task:deleted', {
      taskId: id,
      actor: { id: userId, name: req.user!.name },
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
