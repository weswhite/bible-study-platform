# Bible Study App - Technical Architecture

## System Overview

The Bible Study App is a full-stack TypeScript application following a monorepo architecture with separate frontend and backend deployments. The system is designed for scalability, maintainability, and real-time collaboration features.

```
bible-study/
├── frontend/           # React Router v7 with Remix patterns
├── backend/            # Express.js + Prisma + PostgreSQL
├── .github/workflows/  # CI/CD automation
├── PROJECT_SUMMARY.md  # Project overview
└── ARCHITECTURE.md     # This document
```

## Frontend Architecture

### Technology Stack
- **React Router v7**: Latest version with server-side rendering capabilities
- **Remix Patterns**: Loaders and actions for server-side data fetching
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling framework
- **Vite**: Fast build tool and development server

### Routing Strategy
Following Remix conventions with file-based routing:
```
app/routes/
├── _index.tsx              # Landing page
├── auth/
│   ├── login.tsx          # Login page with action
│   ├── register.tsx       # Registration with action
│   └── logout.tsx         # Logout action
├── dashboard/
│   ├── _layout.tsx        # Dashboard layout
│   ├── _index.tsx         # Dashboard home
│   └── groups/
│       ├── _index.tsx     # Groups list
│       ├── $groupId/
│       │   ├── _layout.tsx
│       │   ├── _index.tsx
│       │   └── studies/
│       │       ├── _index.tsx
│       │       └── $studyId.tsx
│       └── new.tsx        # Create group
└── api/                   # API routes for client-side interactions
```

### Data Flow Patterns
```typescript
// Loader pattern for server-side data fetching
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const group = await getGroup(params.groupId, request);
  return json({ user, group });
}

// Action pattern for mutations
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const result = await createStudy(formData, request);
  return redirect(`/dashboard/groups/${params.groupId}/studies/${result.id}`);
}

// Component with typed data
export default function GroupStudies() {
  const { user, group } = useLoaderData<typeof loader>();
  // Component implementation
}
```

### Component Architecture
```typescript
// Reusable component structure
interface StudyCommentProps {
  studyId: string;
  passage: string;
  comments: Comment[];
  onAddComment: (comment: CreateCommentData) => void;
}

export function StudyComment({ studyId, passage, comments, onAddComment }: StudyCommentProps) {
  const fetcher = useFetcher<typeof action>();

  const handleSubmit = (comment: string) => {
    fetcher.submit(
      { intent: 'add-comment', studyId, passage, comment },
      { method: 'POST' }
    );
  };

  // Component implementation
}
```

## Backend Architecture

### Technology Stack
- **Express.js**: Web application framework
- **TypeScript**: Full type safety
- **Prisma ORM**: Type-safe database operations
- **PostgreSQL**: Primary database
- **JWT**: Authentication and authorization
- **Socket.io**: Real-time collaboration via WebSocket
- **ts-node**: TypeScript execution for development

### Project Structure
```
backend/
├── src/
│   ├── index.ts           # Application entry point
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts       # JWT authentication
│   │   ├── cors.ts       # CORS configuration
│   │   ├── validation.ts # Input validation middleware
│   │   └── error.ts      # Error handling
│   ├── routes/           # API route definitions
│   │   ├── auth.ts       # Authentication endpoints
│   │   ├── groups.ts     # Study group management
│   │   ├── studies.ts    # Study content management
│   │   ├── comments.ts   # Comment system
│   │   └── users.ts      # User management
│   ├── services/         # Business logic layer
│   │   ├── authService.ts
│   │   ├── groupService.ts
│   │   ├── studyService.ts
│   │   ├── commentService.ts
│   │   ├── markdownService.ts
│   │   └── socketService.ts
│   ├── controllers/      # Request handlers
│   ├── sockets/          # WebSocket event handlers
│   │   ├── studyRoom.ts  # Study session collaboration
│   │   ├── comments.ts   # Real-time commenting
│   │   └── presence.ts   # User presence tracking
│   ├── validators/       # Input validation schemas
│   │   ├── auth.ts       # Auth validation schemas
│   │   ├── study.ts      # Study validation schemas
│   │   └── comment.ts    # Comment validation schemas
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.ts         # Data seeding
├── scripts/            # Administrative scripts
├── tests/              # Test suites
└── Dockerfile.prod     # Production container
```

### Authentication System
Enhanced JWT implementation with refresh tokens:
```typescript
// JWT configuration with refresh tokens
interface JWTTokens {
  accessToken: string;
  refreshToken: string;
}

interface JWTPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

// JWT middleware with refresh token support
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken) throw new Error('No access token provided');

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user) throw new Error('User not found');

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
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          req.user = user;
          req.sessionId = decoded.sessionId;
          return next();
        }
      }
      throw tokenError;
    }
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Token refresh logic
async function refreshTokens(refreshToken: string): Promise<JWTTokens | null> {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JWTPayload;

    // Verify session exists in database
    const session = await prisma.userSession.findUnique({ where: { id: decoded.sessionId } });
    if (!session || session.expiresAt < new Date()) return null;

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return null;

    return generateTokens(user.id, decoded.sessionId);
  } catch (error) {
    return null;
  }
}

// Generate JWT tokens
function generateTokens(userId: string, sessionId: string): JWTTokens {
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

// Role-based access control
export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Real-time Collaboration Architecture
WebSocket implementation for live study collaboration:

```typescript
// Socket.io server setup
import { Server } from 'socket.io';

export function setupSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

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
        username: socket.user.username
      });

      // Send current active users
      const activeUsers = await getActiveUsersInStudy(studyId);
      socket.emit('active-users', activeUsers);
    });

    // Real-time commenting
    socket.on('add-comment', async (data: {
      studyId: string;
      weekId?: string;
      content: string;
      passage?: string;
      position?: any;
    }) => {
      try {
        // Validate and save comment
        const comment = await commentService.createComment({
          ...data,
          authorId: socket.userId
        });

        // Broadcast to study room
        studyNamespace.to(`study:${data.studyId}`).emit('comment-added', {
          comment,
          author: socket.user
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Real-time comment updates
    socket.on('update-comment', async (data: {
      commentId: string;
      content: string;
    }) => {
      try {
        const comment = await commentService.updateComment(
          data.commentId,
          data.content,
          socket.userId
        );

        studyNamespace.to(`study:${socket.currentStudy}`).emit('comment-updated', comment);
      } catch (error) {
        socket.emit('error', { message: 'Failed to update comment' });
      }
    });

    // User presence tracking
    socket.on('user-activity', (data: {
      section: string;
      passage?: string;
    }) => {
      socket.to(`study:${socket.currentStudy}`).emit('user-presence', {
        userId: socket.userId,
        username: socket.user.username,
        section: data.section,
        passage: data.passage,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.currentStudy) {
        socket.to(`study:${socket.currentStudy}`).emit('user-left', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
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

async function getActiveUsersInStudy(studyId: string) {
  // Get from in-memory tracking of active socket connections
  // This would be implemented using Socket.io's built-in room management
  const sockets = await io.in(`study:${studyId}`).fetchSockets();
  return sockets.map(socket => ({
    userId: socket.userId,
    username: socket.user.username
  }));
}
```

### Input Validation Architecture
Comprehensive validation using Zod schemas:

```typescript
// validators/auth.ts
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
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           'Password must contain uppercase, lowercase, number, and special character'),

  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// validators/study.ts
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

  groupId: z.string().cuid('Invalid group ID'),

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
    .max(50000, 'Content must be less than 50,000 characters')
    .refine(validateMarkdownSafety, 'Content contains unsafe elements'),

  scheduledDate: z.string().datetime().optional()
});

// validators/comment.ts
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters')
    .refine(validateCommentSafety, 'Comment contains inappropriate content'),

  studyId: z.string().cuid().optional(),
  weekId: z.string().cuid().optional(),

  passage: z.string()
    .max(100, 'Passage reference must be less than 100 characters')
    .optional(),

  position: z.object({
    line: z.number().int().min(0),
    column: z.number().int().min(0),
    section: z.string().max(50)
  }).optional(),

  parentId: z.string().cuid().optional()
}).refine(
  data => data.studyId || data.weekId,
  'Comment must be associated with either a study or week'
);

// Validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
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

// Content safety validation
function validateMarkdownSafety(content: string): boolean {
  // Block dangerous HTML tags and JavaScript
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
}

function validateCommentSafety(content: string): boolean {
  // Basic profanity and spam detection
  const inappropriatePatterns = [
    /(.)\1{10,}/gi, // Repeated characters (spam)
    /https?:\/\/[^\s]{10,}/gi // Suspicious URLs
  ];

  return !inappropriatePatterns.some(pattern => pattern.test(content));
}
```

### Markdown Processing Pipeline
Secure markdown rendering with study-specific features:

```typescript
// services/markdownService.ts
import MarkdownIt from 'markdown-it';
import DOMPurify from 'isomorphic-dompurify';
import hljs from 'highlight.js';

interface MarkdownProcessingOptions {
  allowComments?: boolean;
  studyId?: string;
  weekId?: string;
}

class MarkdownService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: false, // Disable raw HTML for security
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: this.highlightCode
    });

    // Add custom plugins
    this.md.use(this.studyQuestionPlugin);
    this.md.use(this.bibleReferencePlugin);
    this.md.use(this.commentAnchorPlugin);
  }

  // Process markdown with security and study features
  async processMarkdown(
    content: string,
    options: MarkdownProcessingOptions = {}
  ): Promise<string> {
    try {
      // Pre-process for study-specific syntax
      const preprocessed = this.preprocessStudySyntax(content, options);

      // Convert markdown to HTML
      const html = this.md.render(preprocessed);

      // Sanitize HTML for security
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 'del',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'alt', 'src',
          'class', 'id', 'data-*'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|bible):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });

      // Post-process for study features
      return this.postprocessStudyFeatures(sanitized, options);
    } catch (error) {
      console.error('Markdown processing error:', error);
      throw new Error('Failed to process markdown content');
    }
  }

  // Highlight code blocks
  private highlightCode(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (error) {
        console.error('Code highlighting error:', error);
      }
    }
    return '';
  }

  // Custom plugin for study questions
  private studyQuestionPlugin(md: MarkdownIt) {
    md.renderer.rules.paragraph_open = (tokens, idx, options, env) => {
      const token = tokens[idx];
      const content = tokens[idx + 1]?.content || '';

      // Detect question syntax: Q: or Question:
      if (/^(Q:|Question:)\s+/i.test(content)) {
        return `<div class="study-question" data-question-id="${generateQuestionId()}">`;
      }

      return '<p>';
    };

    md.renderer.rules.paragraph_close = (tokens, idx) => {
      const content = tokens[idx - 1]?.content || '';
      if (/^(Q:|Question:)\s+/i.test(content)) {
        return '</div>';
      }
      return '</p>';
    };
  }

  // Custom plugin for Bible references
  private bibleReferencePlugin(md: MarkdownIt) {
    md.renderer.rules.text = (tokens, idx) => {
      const token = tokens[idx];
      const bibleRefRegex = /\b(\d?\s*[A-Za-z]+\.?\s+\d+:\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\b/g;

      return token.content.replace(bibleRefRegex, (match, ref) => {
        const cleanRef = ref.trim();
        return `<span class="bible-reference" data-reference="${cleanRef}" title="Click to view passage">${cleanRef}</span>`;
      });
    };
  }

  // Custom plugin for comment anchors
  private commentAnchorPlugin(md: MarkdownIt) {
    md.renderer.rules.paragraph_open = (tokens, idx, options, env) => {
      const lineNumber = tokens[idx].attrGet('data-line') || idx;
      return `<p class="commentable" data-line="${lineNumber}">`;
    };
  }

  // Pre-process study-specific syntax
  private preprocessStudySyntax(content: string, options: MarkdownProcessingOptions): string {
    let processed = content;

    // Process study callouts: [!NOTE], [!WARNING], etc.
    processed = processed.replace(
      /\[!(NOTE|WARNING|TIP|IMPORTANT)\]\s*\n(.*?)(?=\n\[!|\n\n|$)/gs,
      (match, type, content) => {
        const className = `study-callout study-callout-${type.toLowerCase()}`;
        return `<div class="${className}"><strong>${type}:</strong> ${content.trim()}</div>\n`;
      }
    );

    // Process prayer sections: [PRAYER] ... [/PRAYER]
    processed = processed.replace(
      /\[PRAYER\](.*?)\[\/PRAYER\]/gs,
      '<div class="prayer-section"><h4>Prayer</h4>$1</div>'
    );

    return processed;
  }

  // Post-process for study features
  private postprocessStudyFeatures(html: string, options: MarkdownProcessingOptions): string {
    let processed = html;

    // Add comment buttons if comments are enabled
    if (options.allowComments) {
      processed = processed.replace(
        /<p class="commentable" data-line="(\d+)">/g,
        '<p class="commentable" data-line="$1"><button class="add-comment-btn" data-line="$1">💬</button>'
      );
    }

    return processed;
  }
}

// Utility function for question IDs
function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const markdownService = new MarkdownService();
```

## Database Design

### Core Entities
```typescript
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

### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_group_leader ON "StudyGroup"(leaderId);
CREATE INDEX idx_study_group ON "Study"(groupId);
CREATE INDEX idx_comment_study ON "Comment"(studyId);
CREATE INDEX idx_comment_week ON "Comment"(weekId);
CREATE INDEX idx_comment_author ON "Comment"(authorId);
CREATE INDEX idx_response_user_study ON "StudyResponse"(userId, studyId);
```

## API Design

### RESTful Endpoints
```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/verify

// User management
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/:id

// Study groups
GET    /api/groups                    # User's groups
POST   /api/groups                    # Create group
GET    /api/groups/:id                # Group details
PUT    /api/groups/:id                # Update group
DELETE /api/groups/:id                # Delete group
POST   /api/groups/:id/members        # Add member
DELETE /api/groups/:id/members/:userId # Remove member

// Studies
GET    /api/groups/:groupId/studies           # Group's studies
POST   /api/groups/:groupId/studies           # Create study
GET    /api/studies/:id                       # Study details
PUT    /api/studies/:id                       # Update study
DELETE /api/studies/:id                       # Delete study
GET    /api/studies/:id/weeks                 # Study weeks
POST   /api/studies/:id/weeks                 # Create week
GET    /api/studies/:id/weeks/:weekNumber     # Week details
PUT    /api/studies/:id/weeks/:weekNumber     # Update week

// Comments & Responses
GET    /api/studies/:id/comments              # Study comments
POST   /api/studies/:id/comments              # Add comment
GET    /api/weeks/:id/comments                # Week comments
POST   /api/weeks/:id/comments                # Add comment
PUT    /api/comments/:id                      # Update comment
DELETE /api/comments/:id                      # Delete comment

POST   /api/studies/:id/responses             # Submit response
GET    /api/studies/:id/responses/:userId     # User's responses
PUT    /api/responses/:id                     # Update response
```

### Error Handling
```typescript
// Standardized error responses
interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// Error handling middleware
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      details: error.errors
    });
  }

  if (error instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid credentials'
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
}
```

## Deployment Architecture

### Fly.io Configuration
Following the Waters app deployment pattern:

```toml
# backend/fly.toml
app = "bible-study-backend"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile.prod"

[env]
  NODE_ENV = "production"
  PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[deploy]
  release_command = "npx prisma migrate deploy && npx prisma generate"

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

```toml
# frontend/fly.toml
app = "bible-study-frontend"
primary_region = "den"

[build]

[env]
  NODE_ENV = "production"
  API_URL = "https://bible-study-backend.fly.dev"
  VITE_API_BASE_URL = "https://bible-study-backend.fly.dev"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Bible Study App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./frontend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Security Architecture

### Authentication & Authorization
```typescript
// JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET!,
  expiresIn: '7d',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const
};

// Password security
const bcryptConfig = {
  saltRounds: 12
};

// Role-based permissions
const permissions = {
  USER: ['read:own_profile', 'create:comment', 'join:group'],
  MODERATOR: ['moderate:comments', 'manage:group_members'],
  LEADER: ['create:study', 'manage:group', 'moderate:all'],
  ADMIN: ['manage:users', 'manage:system']
};
```

### Data Protection
- Input validation using express-validator
- SQL injection prevention via Prisma ORM
- XSS protection through content sanitization
- CSRF protection with signed cookies
- Rate limiting on authentication endpoints

## Performance Optimization

### Frontend Optimization
Enhanced client-side performance strategies:

```typescript
// Service Worker for offline functionality
// public/sw.js
const CACHE_NAME = 'bible-study-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add other static assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version or fetch from network
          return response || fetch(event.request);
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        })
    );
  }
});

// Image optimization component
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function OptimizedImage({ src, alt, className, loading = 'lazy' }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className={`image-container ${className || ''}`}>
      {!isLoaded && !error && (
        <div className="image-placeholder animate-pulse bg-gray-200" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

// Code splitting for routes
import { lazy, Suspense } from 'react';
import { LoaderFunctionArgs } from 'react-router-dom';

// Lazy load heavy components
const StudyViewer = lazy(() => import('../components/StudyViewer'));
const GroupDashboard = lazy(() => import('../components/GroupDashboard'));

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
    </div>
  );
}

// Route with code splitting
export default function StudyRoute() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StudyViewer />
    </Suspense>
  );
}
```

### Backend Optimization
Advanced server-side performance strategies:

```typescript
// Database query optimization service
class QueryOptimizationService {
  // Optimized study loading with selective includes
  async getStudyWithDetails(studyId: string, userId: string) {
    return await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            leaderId: true,
            members: {
              where: { userId },
              select: { role: true }
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
  }

  // Paginated comments with cursor-based pagination
  async getStudyComments(studyId: string, cursor?: string, limit = 20) {
    const comments = await prisma.comment.findMany({
      where: { studyId },
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
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined
    });

    const hasNextPage = comments.length > limit;
    const items = hasNextPage ? comments.slice(0, -1) : comments;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasNextPage
    };
  }

  // Batch user group loading
  async getUserGroupsBatch(userIds: string[]) {
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: { in: userIds }
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            leaderId: true,
            isActive: true
          }
        }
      }
    });

    // Group by userId for efficient lookup
    return memberships.reduce((acc, membership) => {
      if (!acc[membership.userId]) {
        acc[membership.userId] = [];
      }
      acc[membership.userId].push({
        ...membership.group,
        memberRole: membership.role
      });
      return acc;
    }, {} as Record<string, any[]>);
  }
}

// Response compression and optimization middleware
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// Smart compression based on content type
export function smartCompression() {
  return compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Compress text-based responses
      const contentType = res.getHeader('content-type');
      if (typeof contentType === 'string') {
        return /text|json|javascript|css/.test(contentType);
      }

      return compression.filter(req, res);
    },
    level: 6, // Balance between compression ratio and speed
    threshold: 1024 // Only compress responses larger than 1KB
  });
}

// Response time tracking middleware
export function responseTimeMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);

      // Log slow queries for optimization
      if (duration > 1000) {
        console.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
      }
    });

    next();
  };
}

// Request rate limiting
import rateLimit from 'express-rate-limit';

export const createRateLimit = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// API-specific rate limits
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const apiRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const commentRateLimit = createRateLimit(60 * 1000, 10); // 10 comments per minute
```

### Database Optimization
Enhanced database performance strategies:

```sql
-- Additional performance indexes
CREATE INDEX CONCURRENTLY idx_study_group_active ON "Study"(groupId, isActive) WHERE isActive = true;
CREATE INDEX CONCURRENTLY idx_comment_study_created ON "Comment"(studyId, createdAt DESC);
CREATE INDEX CONCURRENTLY idx_comment_week_created ON "Comment"(weekId, createdAt DESC);
CREATE INDEX CONCURRENTLY idx_user_session ON "User"(id) WHERE role != 'USER'; -- For admin queries
CREATE INDEX CONCURRENTLY idx_group_member_active ON "GroupMember"(groupId, userId) WHERE role != 'MEMBER';
CREATE INDEX CONCURRENTLY idx_study_response_user_week ON "StudyResponse"(userId, weekId, questionId);

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY idx_study_scheduled ON "Study"(scheduledDate) WHERE scheduledDate IS NOT NULL AND isActive = true;
CREATE INDEX CONCURRENTLY idx_week_scheduled ON "StudyWeek"(scheduledDate) WHERE scheduledDate IS NOT NULL;

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_comment_threaded ON "Comment"(studyId, parentId, createdAt) WHERE parentId IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_user_groups_leader ON "StudyGroup"(leaderId, isActive, createdAt DESC);
```

```typescript
// Database connection optimization
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Connection pool configuration
// In DATABASE_URL: postgresql://user:pass@host:port/db?connection_limit=20&pool_timeout=20&socket_timeout=60

// Query optimization utilities
export class DatabaseOptimization {
  // Use database transactions for related operations
  static async createStudyWithWeeks(studyData: any, weeksData: any[]) {
    return await prisma.$transaction(async (tx) => {
      const study = await tx.study.create({
        data: studyData
      });

      const weeks = await Promise.all(
        weeksData.map((weekData, index) =>
          tx.studyWeek.create({
            data: {
              ...weekData,
              studyId: study.id,
              weekNumber: index + 1
            }
          })
        )
      );

      return { study, weeks };
    });
  }

  // Batch operations for better performance
  static async createMultipleComments(commentsData: any[]) {
    return await prisma.comment.createMany({
      data: commentsData,
      skipDuplicates: true
    });
  }

  // Read replicas configuration (for future scaling)
  static async readOnlyQuery<T>(query: () => Promise<T>): Promise<T> {
    // This would connect to a read replica when available
    return await query();
  }
}
```

## Monitoring & Observability

### Application Monitoring
- Error tracking and reporting
- Performance metrics collection
- User analytics (privacy-focused)
- API endpoint monitoring
- Database performance tracking

### Infrastructure Monitoring
- Fly.io metrics integration
- Uptime monitoring
- Resource utilization tracking
- Automated alerts for critical issues

This architecture provides a solid foundation for a scalable, maintainable Bible study application that can grow with user needs while maintaining security and performance standards.