import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be at most 100 characters'),
});

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be at most 100 characters'),
  description: z.string().max(500).optional(),
});

export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name must be at most 255 characters'),
  parentId: z.string().uuid().optional(),
});

export const createNoteSchema = z.object({
  title: z.string().max(500).default('Untitled'),
  type: z.enum(['text', 'drawing']).default('text'),
  folderId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  visibility: z.enum(['private', 'workspace', 'custom']).default('workspace'),
  tags: z.array(z.string().uuid()).optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  folderId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['private', 'workspace', 'custom']).optional(),
  pinned: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(100, 'Tag name must be at most 100 characters'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format')
    .default('#6366f1'),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  tags: z.array(z.string().uuid()).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
