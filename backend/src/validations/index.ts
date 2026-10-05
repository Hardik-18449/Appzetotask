import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
});

export const addMemberSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
}).refine((data) => data.email || data.userId, {
  message: 'Either email or userId must be provided',
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(250),
  description: z.string().max(10000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(250).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  order: z.number().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});
