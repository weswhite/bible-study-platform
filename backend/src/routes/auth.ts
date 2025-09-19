import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validators/auth';
import { generateTokens, setTokenCookies, clearTokenCookies, authMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Register endpoint
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and session in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          firstName,
          lastName
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      });

      const session = await tx.userSession.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return { user, session };
    });

    // Generate tokens
    const tokens = generateTokens(result.user.id, result.session.id);
    setTokenCookies(res, tokens);

    res.status(201).json({
      message: 'User created successfully',
      user: result.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create user account'
    });
  }
});

// Login endpoint
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Create session
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Generate tokens
    const tokens = generateTokens(user.id, session.id);
    setTokenCookies(res, tokens);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to log in'
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Delete session from database
    if (req.sessionId) {
      await prisma.userSession.delete({
        where: { id: req.sessionId }
      }).catch(() => {
        // Ignore errors if session doesn't exist
      });
    }

    // Clear cookies
    clearTokenCookies(res);

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearTokenCookies(res); // Clear cookies anyway
    res.json({
      message: 'Logout successful'
    });
  }
});

// Get current user endpoint
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: req.user
  });
});

// Verify endpoint (check if user is authenticated)
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

export default router;