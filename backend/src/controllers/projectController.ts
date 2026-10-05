import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { AuthenticatedRequest } from '../types';
import { logAuditEvent } from '../services/auditService';

export const createProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const organizationId = req.organizationId!;
    const userId = req.user!.id;

    const project = await Project.create({
      organizationId,
      name,
      description: description || '',
      createdById: userId,
    });

    // Record audit log
    await logAuditEvent({
      user: userId,
      organization: organizationId,
      action: 'PROJECT_CREATED',
      entity: 'Project',
      entityId: project._id as Types.ObjectId,
      oldValue: null,
      newValue: { name: project.name, description: project.description },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.organizationId!;

    const projects = await Project.find({ organizationId, status: 'ACTIVE' })
      .populate('createdById', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId!;

    const project = await Project.findOne({ _id: id, organizationId })
      .populate('createdById', 'name email avatarUrl')
      .lean();

    if (!project) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found in this organization.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};
