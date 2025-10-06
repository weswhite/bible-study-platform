import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createStudySchema, createStudyWeekSchema } from '../validators/study';

const router = express.Router();
const prisma = new PrismaClient();

// Create new study in a group
router.post('/', authMiddleware, validateRequest(createStudySchema), async (req, res) => {
  try {
    const { title, description, focusType, focusReference, scheduledDate } = req.body;
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({
        error: 'Group ID required',
        message: 'Please specify which group this study is for'
      });
    }

    // Verify user can create studies in this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: req.user.id,
        groupId: groupId as string,
        role: { in: ['LEADER', 'MODERATOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group leader or moderator to create studies'
      });
    }

    const study = await prisma.study.create({
      data: {
        title,
        description,
        focusType,
        focusReference,
        groupId: groupId as string,
        markdownPath: '', // Will be populated when content is added
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null
      },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Study created successfully',
      study
    });
  } catch (error) {
    console.error('Error creating study:', error);
    res.status(500).json({
      error: 'Failed to create study',
      message: 'Unable to create study'
    });
  }
});

// Get study details
router.get('/:studyId', authMiddleware, async (req, res) => {
  try {
    const { studyId } = req.params;

    // First get the study to find the group
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      select: { groupId: true }
    });

    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        message: 'The requested study does not exist'
      });
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: req.user.id,
        groupId: study.groupId
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group member to view this study'
      });
    }

    // Get full study details
    const fullStudy = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            leader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            id: true,
            weekNumber: true,
            title: true,
            passage: true,
            scheduledDate: true,
            markdownContent: true,
            createdAt: true,
            _count: {
              select: {
                comments: true,
                responses: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true,
            responses: true
          }
        }
      }
    });

    res.json({
      study: fullStudy,
      userRole: membership.role
    });
  } catch (error) {
    console.error('Error fetching study:', error);
    res.status(500).json({
      error: 'Failed to fetch study',
      message: 'Unable to retrieve study details'
    });
  }
});

// Add week to study
router.post('/:studyId/weeks', authMiddleware, validateRequest(createStudyWeekSchema), async (req, res) => {
  try {
    const { studyId } = req.params;
    const { title, passage, markdownContent, scheduledDate } = req.body;

    // Get study and verify permissions
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

    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        message: 'The requested study does not exist'
      });
    }

    const membership = study.group.members[0];
    if (!membership || !['LEADER', 'MODERATOR'].includes(membership.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group leader or moderator to add study weeks'
      });
    }

    // Get next week number
    const lastWeek = await prisma.studyWeek.findFirst({
      where: { studyId },
      orderBy: { weekNumber: 'desc' }
    });

    const weekNumber = (lastWeek?.weekNumber || 0) + 1;

    const week = await prisma.studyWeek.create({
      data: {
        studyId,
        weekNumber,
        title,
        passage,
        markdownContent,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null
      }
    });

    res.status(201).json({
      message: 'Study week added successfully',
      week
    });
  } catch (error) {
    console.error('Error adding study week:', error);
    res.status(500).json({
      error: 'Failed to add study week',
      message: 'Unable to add week to study'
    });
  }
});

// Get specific week
router.get('/:studyId/weeks/:weekNumber', authMiddleware, async (req, res) => {
  try {
    const { studyId, weekNumber } = req.params;

    // Verify access to study first
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

    if (!study || study.group.members.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group member to view this study'
      });
    }

    const week = await prisma.studyWeek.findFirst({
      where: {
        studyId,
        weekNumber: parseInt(weekNumber)
      },
      include: {
        study: {
          select: {
            id: true,
            title: true,
            focusType: true,
            focusReference: true,
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        comments: {
          where: { parentId: null }, // Only top-level comments
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
        }
      }
    });

    if (!week) {
      return res.status(404).json({
        error: 'Week not found',
        message: 'The requested study week does not exist'
      });
    }

    res.json({
      week,
      userRole: study.group.members[0].role
    });
  } catch (error) {
    console.error('Error fetching study week:', error);
    res.status(500).json({
      error: 'Failed to fetch study week',
      message: 'Unable to retrieve week details'
    });
  }
});

// Delete study
router.delete('/:studyId', authMiddleware, async (req, res) => {
  try {
    const { studyId } = req.params;

    // Get study and verify permissions
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

    if (!study) {
      return res.status(404).json({
        error: 'Study not found',
        message: 'The requested study does not exist'
      });
    }

    const membership = study.group.members[0];
    if (!membership || !['LEADER', 'MODERATOR'].includes(membership.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group leader or moderator to delete studies'
      });
    }

    // Delete related records first (cascading delete)
    await prisma.studyResponse.deleteMany({
      where: { studyId }
    });

    await prisma.comment.deleteMany({
      where: { studyId }
    });

    await prisma.studyWeek.deleteMany({
      where: { studyId }
    });

    // Finally delete the study
    await prisma.study.delete({
      where: { id: studyId }
    });

    res.json({
      message: 'Study deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting study:', error);
    res.status(500).json({
      error: 'Failed to delete study',
      message: 'Unable to delete study'
    });
  }
});

export default router;