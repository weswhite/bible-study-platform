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
import commentRoutes from './routes/comments';

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

// Log CORS configuration
console.log('CORS Configuration:', {
  allowedOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser

// Log request origin for debugging
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('POST Request Origin:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      path: req.path,
      cookies: Object.keys(req.cookies)
    });
  }
  next();
});

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
app.use('/api/comments', commentRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
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