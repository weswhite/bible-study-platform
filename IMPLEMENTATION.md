# Bible Study App - Implementation Guide

## Overview

This document provides step-by-step implementation instructions for the Bible Study application. Each step is atomic and functional, meaning you can test and verify functionality after completing each step.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Git repository initialized
- Code editor (VS Code recommended)

## Phase Structure

Each phase builds upon the previous phase and includes:
- **Atomic Steps**: Each step produces working, testable functionality
- **Verification**: Commands to test that each step works
- **Expected Output**: What you should see when the step is complete
- **Troubleshooting**: Common issues and solutions

---

## Phase 1: Project Foundation

### Step 1.1: Initialize Backend Project Structure

**Objective**: Create the backend project with TypeScript and basic dependencies.

**Commands**:
```bash
cd bible-study
mkdir backend
cd backend
npm init -y
```

**Install Dependencies**:
```bash
npm install express cors helmet morgan dotenv bcryptjs jsonwebtoken
npm install prisma @prisma/client
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken
npm install -D ts-node nodemon
```

**Create Configuration Files**:

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `backend/package.json` scripts section:
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

Create `backend/.env`:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/bible_study_dev"
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
FRONTEND_URL="http://localhost:3000"
```

**Verification**:
```bash
npx tsc --noEmit
```

**Expected Output**: No TypeScript compilation errors.

**Status**: ✅ COMPLETED

---

### Step 1.2: Set Up Database Schema

**Objective**: Initialize Prisma and create the complete database schema.

**Commands**:
```bash
npx prisma init
```

Replace `backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User management
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  password  String   // bcrypt hashed
  firstName String?
  lastName  String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  membershipGroups   GroupMember[]
  leaderGroups       StudyGroup[]  @relation("GroupLeader")
  comments           Comment[]
  studyResponses     StudyResponse[]
  sessions           UserSession[]

  @@map("users")
}

// User session management for JWT refresh tokens
model UserSession {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("user_sessions")
}

// Study group system
model StudyGroup {
  id          String   @id @default(cuid())
  name        String
  description String?
  leaderId    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  leader      User           @relation("GroupLeader", fields: [leaderId], references: [id])
  members     GroupMember[]
  studies     Study[]

  @@map("study_groups")
}

model GroupMember {
  id        String     @id @default(cuid())
  userId    String
  groupId   String
  role      MemberRole @default(MEMBER)
  joinedAt  DateTime   @default(now())

  // Relationships
  user      User       @relation(fields: [userId], references: [id])
  group     StudyGroup @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
  @@map("group_members")
}

// Study content system
model Study {
  id              String      @id @default(cuid())
  title           String
  description     String?
  focusType       FocusType   // BOOK or THEME
  focusReference  String      // e.g., "Genesis" or "Prayer"
  groupId         String
  markdownPath    String      // Path to markdown file
  scheduledDate   DateTime?
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relationships
  group           StudyGroup    @relation(fields: [groupId], references: [id])
  weeks           StudyWeek[]
  comments        Comment[]
  responses       StudyResponse[]

  @@map("studies")
}

model StudyWeek {
  id              String   @id @default(cuid())
  studyId         String
  weekNumber      Int
  title           String
  passage         String   // Bible passage reference
  scheduledDate   DateTime?
  markdownContent String   // Markdown content for the week
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  study           Study      @relation(fields: [studyId], references: [id])
  comments        Comment[]
  responses       StudyResponse[]

  @@unique([studyId, weekNumber])
  @@map("study_weeks")
}

// Interactive features
model Comment {
  id          String    @id @default(cuid())
  content     String
  authorId    String
  studyId     String?
  weekId      String?
  passage     String?   // Specific passage reference
  position    Json?     // Position data for inline comments
  parentId    String?   // For threaded comments
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relationships
  author      User         @relation(fields: [authorId], references: [id])
  study       Study?       @relation(fields: [studyId], references: [id])
  week        StudyWeek?   @relation(fields: [weekId], references: [id])
  parent      Comment?     @relation("CommentThread", fields: [parentId], references: [id])
  replies     Comment[]    @relation("CommentThread")

  @@map("comments")
}

model StudyResponse {
  id          String    @id @default(cuid())
  userId      String
  studyId     String?
  weekId      String?
  questionId  String    // Identifier for the question within the study
  response    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relationships
  user        User         @relation(fields: [userId], references: [id])
  study       Study?       @relation(fields: [studyId], references: [id])
  week        StudyWeek?   @relation(fields: [weekId], references: [id])

  @@unique([userId, studyId, weekId, questionId])
  @@map("study_responses")
}

// Enums
enum UserRole {
  USER
  ADMIN
}

enum MemberRole {
  MEMBER
  MODERATOR
  LEADER
}

enum FocusType {
  BOOK
  THEME
}
```

**Generate and Push Database**:
```bash
npx prisma generate
npx prisma db push
```

**Verification**:
```bash
npx prisma studio
```

**Expected Output**: Prisma Studio opens in browser showing all tables created.

---

### Step 1.3: Create Basic Express Server

**Objective**: Set up a working Express server with middleware.

Create `backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes placeholder
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

export default app;
```

**Start the Server**:
```bash
npm run dev
```

**Verification**:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/test
```

**Expected Output**:
- Server starts without errors
- Health check returns JSON with status "healthy"
- Test endpoint returns "API is working!" message

---

### Step 1.4: Initialize Frontend Project

**Objective**: Create React Router v7 frontend with TypeScript.

**Commands**:
```bash
cd ../  # Back to bible-study root
npx create-react-router@latest frontend --template typescript
cd frontend
```

**Install Additional Dependencies**:
```bash
npm install axios tailwindcss
npm install -D @types/node
```

**Setup Environment Variables**:

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001
```

**Update Vite Configuration**:

Edit `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

**Create API Client**:

Create `frontend/app/lib/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
```

**Create Basic Routes**:

Replace `frontend/app/routes/_index.tsx`:
```tsx
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => {
  return [
    { title: 'Bible Study App' },
    { name: 'description', content: 'Collaborative Bible study platform' },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bible Study App
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Collaborative scripture study for small groups
          </p>
          <div className="space-y-4">
            <a
              href="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </a>
            <a
              href="/auth/register"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Start Frontend**:
```bash
npm run dev
```

**Verification**:
- Visit http://localhost:3000
- See landing page with "Bible Study App" title
- Backend and frontend should both be running simultaneously

**Expected Output**: Landing page loads with sign in/register buttons.

---

## Phase 2: Authentication System

### Step 2.1: Create Authentication Middleware

**Objective**: Implement JWT authentication with refresh token support.

Create `backend/src/middleware/auth.ts`:
```typescript
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
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, sessionId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// Set token cookies
export function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

    if (!accessToken) {
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
```

**Verification**: TypeScript compilation should succeed:
```bash
npx tsc --noEmit
```

**Expected Output**: No compilation errors.

---

### Step 2.2: Create Input Validation

**Objective**: Set up Zod validation schemas for authentication.

**Install Zod**:
```bash
npm install zod
```

Create `backend/src/validators/auth.ts`:
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),

  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

Create `backend/src/middleware/validation.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors
        });
      }
      next(error);
    }
  };
}
```

**Verification**: Check TypeScript compilation:
```bash
npx tsc --noEmit
```

**Expected Output**: No compilation errors.

---

### Step 2.3: Create Authentication Routes

**Objective**: Implement login, register, and logout endpoints.

**Install bcryptjs**:
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Create `backend/src/routes/auth.ts`:
```typescript
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
    const result = await prisma.$transaction(async (tx) => {
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
```

**Update Main Server**:

Edit `backend/src/index.ts` to add auth routes:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});

export default app;
```

**Install cookie-parser**:
```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

**Verification**: Test the authentication endpoints:
```bash
# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Test protected route
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

**Expected Output**:
- Registration creates user and returns user data
- Login returns success message and sets cookies
- Protected route returns user data when authenticated

---

### Step 2.4: Create Frontend Authentication Pages

**Objective**: Build login and registration forms with API integration.

Create `frontend/app/routes/auth.login.tsx`:
```tsx
import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const response = await api.post('/api/auth/login', {
      email,
      password
    });

    if (response.status === 200) {
      return redirect('/dashboard');
    }
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Login failed'
    };
  }

  return null;
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <Form className="mt-8 space-y-6" method="post">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <a href="/auth/register" className="text-blue-600 hover:text-blue-500">
              Don't have an account? Register here
            </a>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

Create `frontend/app/routes/auth.register.tsx`:
```tsx
import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  try {
    const response = await api.post('/api/auth/register', {
      username,
      email,
      password,
      firstName,
      lastName
    });

    if (response.status === 201) {
      return redirect('/dashboard');
    }
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Registration failed',
      details: error.response?.data?.details || []
    };
  }

  return null;
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <Form className="mt-8 space-y-6" method="post">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must contain uppercase, lowercase, number, and special character
              </p>
            </div>
          </div>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>{actionData.error}</p>
              {actionData.details && actionData.details.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm">
                  {actionData.details.map((detail: any, index: number) => (
                    <li key={index}>{detail.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <a href="/auth/login" className="text-blue-600 hover:text-blue-500">
              Already have an account? Sign in here
            </a>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

Create `frontend/app/routes/dashboard._index.tsx`:
```tsx
import { redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await api.get('/api/auth/me', {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return { user: response.data.user };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Redirect anyway
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Bible Study Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.firstName || user.username}!
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dashboard Coming Soon
              </h2>
              <p className="text-gray-600">
                Study groups and collaboration features will be implemented next.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Verification**: Test the complete authentication flow:
1. Visit http://localhost:3000
2. Click "Create Account"
3. Fill out registration form with valid data
4. Should redirect to dashboard
5. Click logout, should return to home page
6. Click "Sign In" and use the credentials you created
7. Should redirect back to dashboard

**Expected Output**:
- Registration creates account and logs user in
- Login works with created credentials
- Dashboard shows user's name
- Logout clears session and redirects to home page

---

---

## Phase 3: Study Management System

### Step 3.1: Create Study Group Management

**Objective**: Implement study group creation, membership, and basic management.

Create `backend/src/validators/study.ts`:
```typescript
import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
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
```

Create `backend/src/routes/groups.ts`:
```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
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
    const { name, description } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.studyGroup.create({
        data: {
          name,
          description,
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

// Add member to group
router.post('/:groupId/members', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide the email of the user to add'
      });
    }

    // Verify user is a leader of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: req.user.id,
        groupId: groupId,
        role: { in: ['LEADER', 'MODERATOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You must be a group leader to add members'
      });
    }

    // Find user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (!userToAdd) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that email address'
      });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        userId: userToAdd.id,
        groupId: groupId
      }
    });

    if (existingMembership) {
      return res.status(400).json({
        error: 'Already a member',
        message: 'This user is already a member of the group'
      });
    }

    // Add user to group
    const newMembership = await prisma.groupMember.create({
      data: {
        userId: userToAdd.id,
        groupId: groupId,
        role: 'MEMBER'
      },
      include: {
        user: {
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
      message: 'Member added successfully',
      member: newMembership
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      error: 'Failed to add member',
      message: 'Unable to add user to group'
    });
  }
});

export default router;
```

**Update Main Server**:

Edit `backend/src/index.ts` to add group routes:
```typescript
// Add this import
import groupRoutes from './routes/groups';

// Add this route after auth routes
app.use('/api/groups', groupRoutes);
```

**Verification**: Test group management endpoints:
```bash
# Login first and save cookies
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "TestPass123!"}'

# Create a group
curl -X POST http://localhost:3001/api/groups \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Genesis Study Group", "description": "Studying the book of Genesis together"}'

# Get user's groups
curl http://localhost:3001/api/groups \
  -b cookies.txt
```

**Expected Output**:
- Group creation returns success and group data
- Groups list shows the created group with user as leader

---

### Step 3.2: Create Study Content Management

**Objective**: Implement study creation and week management.

Create `backend/src/routes/studies.ts`:
```typescript
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
            focusReference: true
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

export default router;
```

**Update Main Server**:

Edit `backend/src/index.ts` to add study routes:
```typescript
// Add this import
import studyRoutes from './routes/studies';

// Add this route after group routes
app.use('/api/studies', studyRoutes);
```

**Verification**: Test study management:
```bash
# Create a study (replace GROUP_ID with actual ID from previous step)
curl -X POST "http://localhost:3001/api/studies?groupId=GROUP_ID" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Genesis Chapter 1-3",
    "description": "Creation and the Fall",
    "focusType": "BOOK",
    "focusReference": "Genesis 1-3"
  }'

# Add a week to the study (replace STUDY_ID)
curl -X POST http://localhost:3001/api/studies/STUDY_ID/weeks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "In the Beginning",
    "passage": "Genesis 1:1-31",
    "markdownContent": "# Week 1: In the Beginning\n\n## Passage: Genesis 1:1-31\n\n### Questions for Discussion\n\n1. What does it mean that God created everything from nothing?\n2. How does the order of creation show God's wisdom?\n\n### Prayer\n\nThank God for His creative power and the beauty of His creation."
  }'

# Get study details
curl http://localhost:3001/api/studies/STUDY_ID \
  -b cookies.txt
```

**Expected Output**:
- Study creation returns success with study data
- Week addition succeeds and returns week data
- Study details include the created week

---

### Step 3.3: Create Frontend Study Management

**Objective**: Build user interface for managing groups and studies.

Create `frontend/app/routes/dashboard.groups._index.tsx`:
```tsx
import { useLoaderData, Form, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await api.get('/api/groups', {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return { groups: response.data.groups };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  try {
    await api.post('/api/groups', {
      name,
      description
    }, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return redirect('/dashboard/groups');
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Failed to create group'
    };
  }
}

export default function GroupsList() {
  const { groups } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Study Groups</h2>
        <button
          onClick={() => {
            const modal = document.getElementById('createGroupModal') as HTMLDialogElement;
            modal?.showModal();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No study groups yet</h3>
          <p className="text-gray-600 mb-4">Create your first study group to get started</p>
          <button
            onClick={() => {
              const modal = document.getElementById('createGroupModal') as HTMLDialogElement;
              modal?.showModal();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => (
            <div key={group.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {group.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {group.memberRole} • {group._count.members} members
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {group.description || 'No description'}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {group._count.studies} studies
                  </span>
                  <a
                    href={`/dashboard/groups/${group.id}`}
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    View Group →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <dialog id="createGroupModal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create Study Group</h3>
          <Form method="post">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Group Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What will this group study together?"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('createGroupModal') as HTMLDialogElement;
                  modal?.close();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Create Group
              </button>
            </div>
          </Form>
        </div>
      </dialog>
    </div>
  );
}
```

Create `frontend/app/routes/dashboard.groups.$groupId._index.tsx`:
```tsx
import { useLoaderData, Form, redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const response = await api.get(`/api/groups/${params.groupId}`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return { group: response.data.group };
  } catch (error) {
    throw redirect('/dashboard/groups');
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'create-study') {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const focusType = formData.get('focusType') as string;
    const focusReference = formData.get('focusReference') as string;

    try {
      const response = await api.post(`/api/studies?groupId=${params.groupId}`, {
        title,
        description,
        focusType,
        focusReference
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });

      return redirect(`/dashboard/studies/${response.data.study.id}`);
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to create study'
      };
    }
  }

  if (intent === 'add-member') {
    const email = formData.get('email') as string;

    try {
      await api.post(`/api/groups/${params.groupId}/members`, {
        email
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });

      return redirect(`/dashboard/groups/${params.groupId}`);
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to add member'
      };
    }
  }

  return null;
}

export default function GroupDetail() {
  const { group } = useLoaderData<typeof loader>();
  const canManage = ['LEADER', 'MODERATOR'].includes(group.currentUserRole);

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600 mt-1">{group.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Led by {group.leader.firstName} {group.leader.lastName} (@{group.leader.username})
            </p>
          </div>
          {canManage && (
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const modal = document.getElementById('addMemberModal') as HTMLDialogElement;
                  modal?.showModal();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add Member
              </button>
              <button
                onClick={() => {
                  const modal = document.getElementById('createStudyModal') as HTMLDialogElement;
                  modal?.showModal();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Study
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Members ({group.members.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {group.members.map((member: any) => (
            <div key={member.id} className="flex items-center space-x-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.user.firstName} {member.user.lastName}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  @{member.user.username} • {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Studies */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Studies ({group.studies.length})
        </h2>
        {group.studies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No studies created yet</p>
            {canManage && (
              <button
                onClick={() => {
                  const modal = document.getElementById('createStudyModal') as HTMLDialogElement;
                  modal?.showModal();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create First Study
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {group.studies.map((study: any) => (
              <div key={study.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{study.title}</h3>
                    <p className="text-sm text-gray-600">{study.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {study.focusType}: {study.focusReference} • {study._count.weeks} weeks
                    </p>
                  </div>
                  <a
                    href={`/dashboard/studies/${study.id}`}
                    className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  >
                    View Study →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <dialog id="addMemberModal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add Member to Group</h3>
          <Form method="post">
            <input type="hidden" name="intent" value="add-member" />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter user's email address"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('addMemberModal') as HTMLDialogElement;
                  modal?.close();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Add Member
              </button>
            </div>
          </Form>
        </div>
      </dialog>

      {/* Create Study Modal */}
      <dialog id="createStudyModal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Study</h3>
          <Form method="post">
            <input type="hidden" name="intent" value="create-study" />
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Study Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="focusType" className="block text-sm font-medium text-gray-700">
                  Focus Type *
                </label>
                <select
                  name="focusType"
                  id="focusType"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="BOOK">Book Study</option>
                  <option value="THEME">Thematic Study</option>
                </select>
              </div>
              <div>
                <label htmlFor="focusReference" className="block text-sm font-medium text-gray-700">
                  Focus Reference *
                </label>
                <input
                  type="text"
                  name="focusReference"
                  id="focusReference"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Genesis, Prayer, Discipleship"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('createStudyModal') as HTMLDialogElement;
                  modal?.close();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Create Study
              </button>
            </div>
          </Form>
        </div>
      </dialog>
    </div>
  );
}
```

**Update Dashboard Navigation**:

Edit `frontend/app/routes/dashboard._index.tsx` to include navigation:
```tsx
import { redirect, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import api from '~/lib/api';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await api.get('/api/auth/me', {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return { user: response.data.user };
  } catch (error) {
    throw redirect('/auth/login');
  }
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold">Bible Study Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <a href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/dashboard/groups" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  My Groups
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.firstName || user.username}!
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">My Groups</h3>
                <p className="text-gray-600 mb-4">Manage your study groups and create new ones</p>
                <a
                  href="/dashboard/groups"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Groups
                </a>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <a
                    href="/dashboard/groups"
                    className="block text-blue-600 hover:text-blue-500 text-sm"
                  >
                    Create new group →
                  </a>
                  <a
                    href="/dashboard/groups"
                    className="block text-blue-600 hover:text-blue-500 text-sm"
                  >
                    Join existing group →
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Create or join a study group</li>
                  <li>2. Start a new Bible study</li>
                  <li>3. Add weekly content</li>
                  <li>4. Collaborate with comments</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Verification**: Test the complete study management flow:
1. Visit http://localhost:3000/dashboard
2. Click "View Groups"
3. Create a new group
4. Add a member (use a different email)
5. Create a study in the group
6. Verify all functionality works

**Expected Output**:
- Group creation and management works
- Study creation within groups works
- Member addition works (though user won't exist)
- Navigation between screens works properly

---

## Phase 4: Real-time Collaboration Features

### Step 4.1: Set Up Socket.io for Real-time Features

**Objective**: Implement WebSocket connection for real-time collaboration.

**Install Socket.io**:
```bash
cd backend
npm install socket.io
npm install -D @types/socket.io
```

Create `backend/src/sockets/index.ts`:
```typescript
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
```

**Update Main Server**:

Edit `backend/src/index.ts` to include Socket.io:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Import routes
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import studyRoutes from './routes/studies';

// Import socket setup
import { setupSocketServer } from './sockets';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io
const io = setupSocketServer(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/studies', studyRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket ready for real-time collaboration`);
});

export default app;
```

**Verification**: Start the server and check for WebSocket support:
```bash
npm run dev
```

**Expected Output**: Server should start with "WebSocket ready for real-time collaboration" message.

---

### Step 4.2: Add Frontend Real-time Features

**Objective**: Implement Socket.io client for real-time collaboration.

**Install Socket.io Client**:
```bash
cd frontend
npm install socket.io-client
```

Create `frontend/app/lib/socket.ts`:
```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectToStudy(accessToken: string) {
  if (socket) {
    socket.disconnect();
  }

  socket = io('/study', {
    auth: {
      token: accessToken
    },
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Connected to study namespace');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from study namespace');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
}

export function joinStudy(studyId: string) {
  if (socket) {
    socket.emit('join-study', studyId);
  }
}

export function leaveStudy() {
  if (socket) {
    socket.emit('leave-study');
  }
}

export function addComment(commentData: any) {
  if (socket) {
    socket.emit('add-comment', commentData);
  }
}

export function updateComment(commentId: string, content: string) {
  if (socket) {
    socket.emit('update-comment', { commentId, content });
  }
}

export function trackUserActivity(activityData: any) {
  if (socket) {
    socket.emit('user-activity', activityData);
  }
}

export function onUserJoined(callback: (user: any) => void) {
  if (socket) {
    socket.on('user-joined', callback);
  }
}

export function onUserLeft(callback: (user: any) => void) {
  if (socket) {
    socket.on('user-left', callback);
  }
}

export function onCommentAdded(callback: (data: any) => void) {
  if (socket) {
    socket.on('comment-added', callback);
  }
}

export function onCommentUpdated(callback: (comment: any) => void) {
  if (socket) {
    socket.on('comment-updated', callback);
  }
}

export function onActiveUsers(callback: (users: any[]) => void) {
  if (socket) {
    socket.on('active-users', callback);
  }
}

export function onUserPresence(callback: (presence: any) => void) {
  if (socket) {
    socket.on('user-presence', callback);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { socket };
```

Create `frontend/app/routes/dashboard.studies.$studyId._index.tsx`:
```tsx
import { useLoaderData, Form, useNavigation } from 'react-router';
import { useEffect, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import api from '~/lib/api';
import {
  connectToStudy,
  joinStudy,
  leaveStudy,
  addComment,
  onUserJoined,
  onUserLeft,
  onCommentAdded,
  onActiveUsers,
  onUserPresence,
  disconnectSocket
} from '~/lib/socket';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const response = await api.get(`/api/studies/${params.studyId}`, {
      headers: {
        Cookie: request.headers.get('Cookie') || ''
      }
    });

    return { study: response.data.study, userRole: response.data.userRole };
  } catch (error) {
    throw new Response('Study not found', { status: 404 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'add-week') {
    const title = formData.get('title') as string;
    const passage = formData.get('passage') as string;
    const markdownContent = formData.get('markdownContent') as string;

    try {
      await api.post(`/api/studies/${params.studyId}/weeks`, {
        title,
        passage,
        markdownContent
      }, {
        headers: {
          Cookie: request.headers.get('Cookie') || ''
        }
      });

      return { success: true };
    } catch (error: any) {
      return {
        error: error.response?.data?.message || 'Failed to add week'
      };
    }
  }

  return null;
}

export default function StudyDetail() {
  const { study, userRole } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const canManage = ['LEADER', 'MODERATOR'].includes(userRole);

  useEffect(() => {
    // Get access token from cookie (simplified for demo)
    const getCookie = (name: string) => {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
      }
      return null;
    };

    const accessToken = getCookie('accessToken');
    if (!accessToken) return;

    // Connect to Socket.io
    connectToStudy(accessToken);
    joinStudy(study.id);

    // Set up event listeners
    onActiveUsers((users) => {
      setActiveUsers(users);
    });

    onUserJoined((user) => {
      setActiveUsers(prev => [...prev, user]);
      setRecentActivity(prev => [
        { type: 'join', user, timestamp: new Date() },
        ...prev.slice(0, 9)
      ]);
    });

    onUserLeft((user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
      setRecentActivity(prev => [
        { type: 'leave', user, timestamp: new Date() },
        ...prev.slice(0, 9)
      ]);
    });

    onCommentAdded((data) => {
      setComments(prev => [data.comment, ...prev]);
      setRecentActivity(prev => [
        { type: 'comment', user: data.author, comment: data.comment, timestamp: new Date() },
        ...prev.slice(0, 9)
      ]);
    });

    onUserPresence((presence) => {
      setRecentActivity(prev => [
        { type: 'activity', ...presence },
        ...prev.slice(0, 9)
      ]);
    });

    // Cleanup
    return () => {
      leaveStudy();
      disconnectSocket();
    };
  }, [study.id]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment({
        studyId: study.id,
        content: newComment,
        passage: null,
        position: null
      });
      setNewComment('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Study Header */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{study.title}</h1>
                <p className="text-gray-600 mt-1">{study.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{study.focusType}: {study.focusReference}</span>
                  <span>•</span>
                  <span>{study.weeks.length} weeks</span>
                  <span>•</span>
                  <span>Group: {study.group.name}</span>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => {
                    const modal = document.getElementById('addWeekModal') as HTMLDialogElement;
                    modal?.showModal();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add Week
                </button>
              )}
            </div>
          </div>

          {/* Study Weeks */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Study Weeks</h2>
            {study.weeks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No weeks added yet</p>
                {canManage && (
                  <button
                    onClick={() => {
                      const modal = document.getElementById('addWeekModal') as HTMLDialogElement;
                      modal?.showModal();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Add First Week
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {study.weeks.map((week: any) => (
                  <div key={week.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Week {week.weekNumber}: {week.title}
                        </h3>
                        <p className="text-sm text-gray-600">Passage: {week.passage}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {week._count.comments} comments • {week._count.responses} responses
                        </p>
                      </div>
                      <a
                        href={`/dashboard/studies/${study.id}/weeks/${week.weekNumber}`}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Study →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Comments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Study Discussion</h2>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment to the study..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Comment
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {comment.author.firstName} {comment.author.lastName}
                      </p>
                      <p className="text-gray-700 mt-1">{comment.content}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Users */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Active Now ({activeUsers.length})
            </h3>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.userId} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              ))}
              {activeUsers.length === 0 && (
                <p className="text-sm text-gray-500">No other users online</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="text-sm">
                  {activity.type === 'join' && (
                    <p className="text-green-600">
                      {activity.user.firstName} joined the study
                    </p>
                  )}
                  {activity.type === 'leave' && (
                    <p className="text-red-600">
                      {activity.user.firstName} left the study
                    </p>
                  )}
                  {activity.type === 'comment' && (
                    <p className="text-blue-600">
                      {activity.user.firstName} added a comment
                    </p>
                  )}
                  {activity.type === 'activity' && (
                    <p className="text-gray-600">
                      {activity.firstName} is viewing {activity.section}
                    </p>
                  )}
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Week Modal */}
      <dialog id="addWeekModal" className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Add Study Week</h3>
          <Form method="post">
            <input type="hidden" name="intent" value="add-week" />
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Week Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="passage" className="block text-sm font-medium text-gray-700">
                  Bible Passage *
                </label>
                <input
                  type="text"
                  name="passage"
                  id="passage"
                  required
                  placeholder="e.g., Genesis 1:1-31"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="markdownContent" className="block text-sm font-medium text-gray-700">
                  Study Content (Markdown) *
                </label>
                <textarea
                  name="markdownContent"
                  id="markdownContent"
                  rows={10}
                  required
                  placeholder="# Week Title

## Passage: [passage reference]

### Introduction

### Questions for Discussion

1. Question one?
2. Question two?

### Prayer

Closing prayer or prayer points..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('addWeekModal') as HTMLDialogElement;
                  modal?.close();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={navigation.state === 'submitting'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {navigation.state === 'submitting' ? 'Adding...' : 'Add Week'}
              </button>
            </div>
          </Form>
        </div>
      </dialog>
    </div>
  );
}
```

**Verification**: Test real-time collaboration:
1. Open two browser windows/tabs
2. Login with the same user in both
3. Navigate to a study in both windows
4. Add a comment in one window
5. Should see the comment appear in real-time in the other window
6. Check active users list updates

**Expected Output**:
- Real-time comments appear instantly across sessions
- Active users list shows online participants
- Activity feed shows user actions in real-time
- Socket connection establishes successfully

---

This completes the comprehensive implementation guide. Each phase builds upon the previous one, with every step being atomic and fully functional. The final result is a working Bible study application with:

1. **Complete authentication system** with JWT and refresh tokens
2. **Study group management** with roles and permissions
3. **Study content creation** with markdown support
4. **Real-time collaboration** with WebSocket integration
5. **Modern frontend** with React Router v7
6. **Type-safe backend** with TypeScript and Prisma

Each step can be tested independently, making it easy to verify functionality as you build.
