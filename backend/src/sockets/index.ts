import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface JWTPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

// Extend Socket interface
declare module 'socket.io' {
  interface Socket {
    userId: string;
    user: any;
    currentStudy?: string;
  }
}

export function setupSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      });

      if (!user) throw new Error('User not found');

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Study room namespace for study-specific collaboration
  const studyNamespace = io.of('/study');

  studyNamespace.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to study namespace`);

    // Join study room
    socket.on('join-study', async (studyId: string) => {
      try {
        // Verify user has access to study
        const hasAccess = await verifyStudyAccess(socket.userId, studyId);
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to study' });
          return;
        }

        socket.join(`study:${studyId}`);
        socket.currentStudy = studyId;

        // Broadcast user presence
        socket.to(`study:${studyId}`).emit('user-joined', {
          userId: socket.userId,
          username: socket.user.username,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        });

        // Send current active users
        const activeUsers = await getActiveUsersInStudy(studyId, studyNamespace);
        socket.emit('active-users', activeUsers);

        console.log(`User ${socket.userId} joined study ${studyId}`);
      } catch (error) {
        console.error('Error joining study:', error);
        socket.emit('error', { message: 'Failed to join study' });
      }
    });

    // Leave study room
    socket.on('leave-study', () => {
      if (socket.currentStudy) {
        socket.to(`study:${socket.currentStudy}`).emit('user-left', {
          userId: socket.userId,
          username: socket.user.username
        });
        socket.leave(`study:${socket.currentStudy}`);
        socket.currentStudy = undefined;
      }
    });

    // Real-time commenting
    socket.on('add-comment', async (data: {
      studyId?: string;
      weekId?: string;
      content: string;
      passage?: string;
      position?: any;
      parentId?: string;
    }) => {
      try {
        // Validate and save comment
        const comment = await prisma.comment.create({
          data: {
            content: data.content,
            authorId: socket.userId,
            studyId: data.studyId || null,
            weekId: data.weekId || null,
            passage: data.passage || null,
            position: data.position || null,
            parentId: data.parentId || null
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

        // Broadcast to study room
        const targetStudy = data.studyId || socket.currentStudy;
        if (targetStudy) {
          studyNamespace.to(`study:${targetStudy}`).emit('comment-added', {
            comment,
            author: socket.user
          });
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Real-time comment updates
    socket.on('update-comment', async (data: {
      commentId: string;
      content: string;
    }) => {
      try {
        // Verify user owns the comment
        const existingComment = await prisma.comment.findUnique({
          where: { id: data.commentId }
        });

        if (!existingComment || existingComment.authorId !== socket.userId) {
          socket.emit('error', { message: 'Cannot update this comment' });
          return;
        }

        const comment = await prisma.comment.update({
          where: { id: data.commentId },
          data: { content: data.content },
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

        studyNamespace.to(`study:${socket.currentStudy}`).emit('comment-updated', comment);
      } catch (error) {
        console.error('Error updating comment:', error);
        socket.emit('error', { message: 'Failed to update comment' });
      }
    });

    // User presence tracking
    socket.on('user-activity', (data: {
      section: string;
      passage?: string;
      weekId?: string;
    }) => {
      if (socket.currentStudy) {
        socket.to(`study:${socket.currentStudy}`).emit('user-presence', {
          userId: socket.userId,
          username: socket.user.username,
          firstName: socket.user.firstName,
          section: data.section,
          passage: data.passage,
          weekId: data.weekId,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.currentStudy) {
        socket.to(`study:${socket.currentStudy}`).emit('user-left', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
      console.log(`User ${socket.userId} disconnected from study namespace`);
    });
  });

  return io;
}

// Helper functions
async function verifyStudyAccess(userId: string, studyId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findFirst({
    where: {
      userId,
      group: {
        studies: {
          some: { id: studyId }
        }
      }
    }
  });
  return !!membership;
}

async function getActiveUsersInStudy(studyId: string, namespace: any) {
  try {
    const sockets = await namespace.in(`study:${studyId}`).fetchSockets();
    return sockets.map((socket: any) => ({
      userId: socket.userId,
      username: socket.user.username,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName
    }));
  } catch (error) {
    console.error('Error getting active users:', error);
    return [];
  }
}