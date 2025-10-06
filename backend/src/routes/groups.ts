import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createGroupSchema } from '../validators/study';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            leader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: {
                members: true,
                studies: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const formattedGroups = groups.map(membership => ({
      ...membership.group,
      memberRole: membership.role,
      memberSince: membership.joinedAt
    }));

    res.json({ groups: formattedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      error: 'Failed to fetch groups',
      message: 'Unable to retrieve your study groups'
    });
  }
});

// Create new group
router.post('/', authMiddleware, validateRequest(createGroupSchema), async (req, res) => {
  try {
    const { name, description, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.studyGroup.create({
        data: {
          name,
          description,
          password: hashedPassword,
          leaderId: req.user.id
        },
        include: {
          leader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Add creator as a leader member
      await tx.groupMember.create({
        data: {
          userId: req.user.id,
          groupId: group.id,
          role: 'LEADER'
        }
      });

      return group;
    });

    res.status(201).json({
      message: 'Group created successfully',
      group: result
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      error: 'Failed to create group',
      message: 'Unable to create study group'
    });
  }
});

// Get all available groups (for join page) - MUST BE BEFORE /:groupId
router.get('/available', authMiddleware, async (req, res) => {
  try {
    const groups = await prisma.studyGroup.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        leader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            members: true,
            studies: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get user's memberships to add membership status to each group
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      select: { groupId: true, role: true }
    });

    const membershipMap = new Map(userMemberships.map(m => [m.groupId, m.role]));

    // Add membership status to each group
    const groupsWithMembership = groups.map(group => ({
      ...group,
      userMembership: membershipMap.get(group.id) || null
    }));

    res.json({ groups: groupsWithMembership });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      error: 'Failed to fetch groups',
      message: 'Unable to fetch available groups'
    });
  }
});

// Search for groups by name - MUST BE BEFORE /:groupId
router.get('/search/:query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid search query',
        message: 'Search query must be at least 2 characters'
      });
    }

    const groups = await prisma.studyGroup.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        leader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            members: true,
            studies: true
          }
        }
      },
      orderBy: { name: 'asc' },
      take: 20 // Limit to 20 results
    });

    // Get user's memberships to add membership status to each group
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      select: { groupId: true, role: true }
    });

    const membershipMap = new Map(userMemberships.map(m => [m.groupId, m.role]));

    // Add membership status to each group
    const groupsWithMembership = groups.map(group => ({
      ...group,
      userMembership: membershipMap.get(group.id) || null
    }));

    res.json({ groups: groupsWithMembership });
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({
      error: 'Failed to search groups',
      message: 'Unable to search for groups'
    });
  }
});

// Get specific group details
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: req.user.id,
        groupId: groupId
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group'
      });
    }

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        leader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        studies: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            focusType: true,
            focusReference: true,
            scheduledDate: true,
            createdAt: true,
            _count: {
              select: {
                weeks: true,
                comments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }

    res.json({
      group: {
        ...group,
        currentUserRole: membership.role
      }
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      error: 'Failed to fetch group',
      message: 'Unable to retrieve group details'
    });
  }
});


// Join a group with password
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { groupId, password } = req.body;

    if (!groupId || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Group ID and password are required'
      });
    }

    // Find the group
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        password: true,
        isActive: true
      }
    });

    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }

    if (!group.isActive) {
      return res.status(400).json({
        error: 'Group inactive',
        message: 'This group is no longer active'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, group.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'The password is incorrect'
      });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        userId: req.user.id,
        groupId: groupId
      }
    });

    if (existingMembership) {
      return res.status(400).json({
        error: 'Already a member',
        message: 'You are already a member of this group'
      });
    }

    // Add user to group
    const membership = await prisma.groupMember.create({
      data: {
        userId: req.user.id,
        groupId: groupId,
        role: 'MEMBER'
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Successfully joined group',
      membership: membership
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({
      error: 'Failed to join group',
      message: 'Unable to join the group'
    });
  }
});

export default router;