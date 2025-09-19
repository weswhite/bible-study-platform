import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password must be less than 50 characters')
});

export const createStudySchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  focusType: z.enum(['BOOK', 'THEME']),
  focusReference: z.string()
    .min(1, 'Focus reference is required')
    .max(50, 'Focus reference must be less than 50 characters'),
  scheduledDate: z.string().datetime().optional()
});

export const createStudyWeekSchema = z.object({
  title: z.string()
    .min(3, 'Week title must be at least 3 characters')
    .max(100, 'Week title must be less than 100 characters'),
  passage: z.string()
    .min(1, 'Bible passage is required')
    .max(100, 'Passage reference must be less than 100 characters'),
  markdownContent: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be less than 50,000 characters'),
  scheduledDate: z.string().datetime().optional()
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateStudyInput = z.infer<typeof createStudySchema>;
export type CreateStudyWeekInput = z.infer<typeof createStudyWeekSchema>;