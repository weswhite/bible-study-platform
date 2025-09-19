import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  weekId: z.string().optional(),
  studyId: z.string().optional(),
  passage: z.string().optional(),
  textAnchor: z.object({
    selectedText: z.string(),
    startOffset: z.number(),
    endOffset: z.number(),
    context: z.string()
  }).optional(),
  parentId: z.string().optional()
});

// Add comment to a study week
router.post('/', authMiddleware, validateRequest(createCommentSchema), async (req, res) => {
  try {
    const { content, weekId, studyId, passage, textAnchor, parentId } = req.body;

    // Verify user has access to the study/week
    let hasAccess = false;

    if (weekId) {
      const week = await prisma.studyWeek.findUnique({
        where: { id: weekId },
        include: {
          study: {
            include: {
              group: {
                include: {
                  members: {
                    where: { userId: req.user.id }
                  }
                }
              }
            }
          }
        }
      });

      hasAccess = !!(week && week.study.group.members.length > 0);
    } else if (studyId) {
      const study = await prisma.study.findUnique({
        where: { id: studyId },
        include: {
          group: {
            include: {
              members: {
                where: { userId: req.user.id }
              }
            }
          }
        }
      });

      hasAccess = !!(study && study.group.members.length > 0);
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group member to comment'
      });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: req.user.id,
        weekId,
        studyId,
        passage,
        position: textAnchor ? {
          type: 'textAnchor',
          ...textAnchor
        } : null,
        parentId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      error: 'Failed to create comment',
      message: 'Unable to add comment'
    });
  }
});

// Get comments for a specific week with text anchors
router.get('/week/:weekId', authMiddleware, async (req, res) => {
  try {
    const { weekId } = req.params;

    // Verify access to the week
    const week = await prisma.studyWeek.findUnique({
      where: { id: weekId },
      include: {
        study: {
          include: {
            group: {
              include: {
                members: {
                  where: { userId: req.user.id }
                }
              }
            }
          }
        }
      }
    });

    if (!week || week.study.group.members.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group member to view comments'
      });
    }

    // Get all comments for this week
    const comments = await prisma.comment.findMany({
      where: {
        weekId,
        parentId: null // Only top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Separate text-anchored comments from regular comments
    const textAnchoredComments = comments.filter(comment =>
      comment.position && typeof comment.position === 'object' && (comment.position as any).type === 'textAnchor'
    );

    const regularComments = comments.filter(comment =>
      !comment.position || (typeof comment.position === 'object' && (comment.position as any).type !== 'textAnchor')
    );

    res.json({
      textAnchoredComments,
      regularComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      error: 'Failed to fetch comments',
      message: 'Unable to retrieve comments'
    });
  }
});

// Reply to a comment
router.post('/:commentId/reply', authMiddleware, validateRequest(createCommentSchema.omit({ weekId: true, studyId: true, textAnchor: true })), async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Get the parent comment to verify access
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        week: {
          include: {
            study: {
              include: {
                group: {
                  include: {
                    members: {
                      where: { userId: req.user.id }
                    }
                  }
                }
              }
            }
          }
        },
        study: {
          include: {
            group: {
              include: {
                members: {
                  where: { userId: req.user.id }
                }
              }
            }
          }
        }
      }
    });

    if (!parentComment) {
      return res.status(404).json({
        error: 'Comment not found',
        message: 'The comment you are trying to reply to does not exist'
      });
    }

    // Verify access
    const hasAccess = (parentComment.week && parentComment.week.study.group.members.length > 0) ||
                     (parentComment.study && parentComment.study.group.members.length > 0);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group member to reply to comments'
      });
    }

    // Create the reply
    const reply = await prisma.comment.create({
      data: {
        content,
        authorId: req.user.id,
        weekId: parentComment.weekId,
        studyId: parentComment.studyId,
        parentId: commentId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Reply added successfully',
      reply
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({
      error: 'Failed to create reply',
      message: 'Unable to add reply'
    });
  }
});

export default router;