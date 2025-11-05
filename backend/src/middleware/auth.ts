import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JWTPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      sessionId?: string;
    }
  }
}

// Generate JWT tokens
export function generateTokens(userId: string, sessionId: string) {
  const accessToken = jwt.sign(
    { userId, sessionId, type: 'access' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '4h' }
  );

  const refreshToken = jwt.sign(
    { userId, sessionId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

// Set token cookies
export function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin POST in production
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin POST in production
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

// Clear token cookies
export function clearTokenCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

// Refresh tokens logic
async function refreshTokens(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JWTPayload;

    // Verify session exists in database
    const session = await prisma.userSession.findUnique({
      where: { id: decoded.sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) return null;

    return generateTokens(user.id, decoded.sessionId);
  } catch (error) {
    return null;
  }
}

// Auth middleware
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    console.log('Auth middleware - cookies:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      allCookies: Object.keys(req.cookies),
      path: req.path,
      method: req.method
    });

    if (!accessToken) {
      console.log('Auth failed: No access token provided');
      return res.status(401).json({ error: 'No access token provided' });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      req.sessionId = decoded.sessionId;
      next();
    } catch (tokenError) {
      // Try to refresh token if access token is expired
      if (refreshToken) {
        const newTokens = await refreshTokens(refreshToken);
        if (newTokens) {
          setTokenCookies(res, newTokens);
          const decoded = jwt.verify(newTokens.accessToken, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          });
          req.user = user;
          req.sessionId = decoded.sessionId;
          return next();
        }
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Optional auth middleware (doesn't fail if no token)
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return next(); // Continue without user
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (user) {
      req.user = user;
      req.sessionId = decoded.sessionId;
    }
  } catch (error) {
    // Ignore token errors in optional middleware
  }

  next();
}