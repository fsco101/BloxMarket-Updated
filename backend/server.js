// Load env FIRST (move to the very top, before any other imports)
import 'dotenv/config';

// Log environment settings
console.log('Environment variables loaded:');
console.log(`- JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || 'not set'}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '[MASKED]' : 'not set'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- PORT: ${process.env.PORT || 'not set'}`);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import tradeRoutes from './routes/trades.js';
import forumRoutes from './routes/forum.js';
import eventRoutes from './routes/events.js';
import adminRoutes from './routes/admin.js';
import uploadsRoutes from './routes/uploads.js';
import verificationRoutes from './routes/verification.js';
import reportRoutes from './routes/reports.js';
import userDatatableRoutes from './routes/datatables/userDatatableRoutes.js';
import eventsDatatableRoutes from './routes/datatables/eventsDatatableRoutes.js';
import forumDatatableRoutes from './routes/datatables/forumDatatableRoutes.js';
import tradingPostDatatableRoutes from './routes/datatables/tradingPostDatatableRoutes.js';

// Import wishlist routes
import wishlistRoutes from './routes/wishlist.js';
import wishlistDatatableRoutes from './routes/datatables/wishlistDatatableRoutes.js';
import reportsDatatableRoutes from './routes/datatables/reportsDatatableRoutes.js';
import middlemanVerificationDatatableRoutes from './routes/datatables/middlemanVerificationDatatableRoutes.js';
import vouchRoutes from './routes/vouches.js';
import notificationRoutes from './routes/notifications.js';

// Import messenger routes
import messageRoutes from './routes/messages.js';
import chatRoutes from './routes/chats.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Attach io to app for use in controllers
app.set('io', io);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - Different limits for different endpoints
// Helper function to create consistent rate limiter responses
const createRateLimitHandler = (message, windowMs) => {
  return (req, res) => {
    // Calculate reset time in seconds
    const resetTime = Math.ceil(windowMs / 1000);
    
    // Set retry-after header
    res.setHeader('Retry-After', resetTime);
    
    // Send the error response
    res.status(429).json({
      error: message,
      retryAfter: resetTime,
      retryAfterMinutes: Math.ceil(resetTime / 60)
    });
  };
};

// Standard limiter for general API requests
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 500)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: createRateLimitHandler('Too many requests, please try again later.', 15 * 60 * 1000),
  skipSuccessfulRequests: false, // Do not count successful requests
});

// Strict limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for auth endpoints (increased from 50)
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many login attempts, please try again later.', 15 * 60 * 1000),
  skipFailedRequests: false, // Count failed requests
});

// Very strict limiter for sensitive operations
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 requests per hour (increased from 10)
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many sensitive operations attempted, please try again later.', 60 * 60 * 1000),
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
// Serve static files (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const tradesDir = path.join(uploadsDir, 'trades');
const forumDir = path.join(uploadsDir, 'forum');
const wishlistsDir = path.join(uploadsDir, 'wishlists');
const avatarsDir = path.join(uploadsDir, 'avatars');
const eventDir = path.join(uploadsDir, 'event');
const documentsDir = path.join(uploadsDir, 'documents');
const middlemanfaceDir = path.join(uploadsDir, 'middlemanface');
const chatDir = path.join(uploadsDir, 'chat');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tradesDir)) {
  fs.mkdirSync(tradesDir, { recursive: true });
}
if (!fs.existsSync(forumDir)) {
  fs.mkdirSync(forumDir, { recursive: true });
}
if (!fs.existsSync(wishlistsDir)) {
  fs.mkdirSync(wishlistsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(eventDir)) {
  fs.mkdirSync(eventDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}
if (!fs.existsSync(middlemanfaceDir)) {
  fs.mkdirSync(middlemanfaceDir, { recursive: true });
}
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bloxmarket';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Connect to database
connectToDatabase();

// Remove this custom CORS middleware as we're using the cors package above

// Apply standard rate limiter to all routes by default
// app.use(standardLimiter); // DISABLED FOR LOCALHOST DEVELOPMENT

// Routes with specific rate limiting
app.use('/api/auth', authRoutes); // Rate limiting disabled for localhost
app.use('/api/trades', tradeRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes); // Rate limiting disabled for localhost
app.use('/api/uploads', uploadsRoutes);
app.use('/api/verification', verificationRoutes); // Rate limiting disabled for localhost
app.use('/api/reports', reportRoutes); // Add report routes
app.use('/api/admin/datatables', userDatatableRoutes);
app.use('/api/wishlists', wishlistRoutes); // Add this line
app.use('/api/vouches', vouchRoutes); // Add vouches routes
app.use('/api/notifications', notificationRoutes); // Add notifications routes

// Messenger routes
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);

// Custom rate limiter for datatable endpoints (which can be resource-intensive)
// const datatableLimiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 5 minutes
//   max: 200, // 200 requests per 5 minutes (increased from 50)
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: 'Too many datatable requests, please try again later.' },
// }); // DISABLED FOR LOCALHOST DEVELOPMENT

// Admin DataTable Routes with rate limiting disabled for localhost
app.use('/api/admin/datatables/users', userDatatableRoutes);
app.use('/api/admin/datatables/events', eventsDatatableRoutes);
app.use('/api/admin/datatables/forum', forumDatatableRoutes);
app.use('/api/admin/datatables/trading-posts', tradingPostDatatableRoutes);
app.use('/api/admin/datatables/wishlists', wishlistDatatableRoutes);
app.use('/api/admin/datatables/reports', reportsDatatableRoutes);
app.use('/api/admin/datatables/verification', middlemanVerificationDatatableRoutes);

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🟢 User ${socket.username} (ID: ${socket.userId}) connected with socket ID: ${socket.id}`);

  // Join user's personal room for direct messaging
  const userRoom = `user_${socket.userId}`;
  socket.join(userRoom);
  console.log(`👤 User ${socket.username} joined personal room: ${userRoom}`);

  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    const chatRoom = `chat_${chatId}`;
    socket.join(chatRoom);
    console.log(`💬 User ${socket.username} joined chat room: ${chatRoom}`);
  });

  // Handle leaving chat rooms
  socket.on('leave_chat', (chatId) => {
    const chatRoom = `chat_${chatId}`;
    socket.leave(chatRoom);
    console.log(`🚪 User ${socket.username} left chat room: ${chatRoom}`);
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.userId,
      username: socket.username,
      chatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
      userId: socket.userId,
      username: socket.username,
      chatId
    });
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`🔴 User ${socket.username} (ID: ${socket.userId}) disconnected`);
  });
});

// Export io instance for use in controllers
export { io };

// Health check endpoint with rate limit info
app.get('/api/health', (req, res) => {
  // Get rate limit info from req if available
  const rateLimitInfo = {
    standard: {
      limit: 1000,
      windowMs: 15 * 60 * 1000,
      windowMinutes: 15
    },
    auth: {
      limit: 100,
      windowMs: 15 * 60 * 1000,
      windowMinutes: 15
    },
    sensitive: {
      limit: 50,
      windowMs: 60 * 60 * 1000,
      windowMinutes: 60
    },
    datatables: {
      limit: 200,
      windowMs: 5 * 60 * 1000,
      windowMinutes: 5
    }
  };

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    rateLimits: rateLimitInfo,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🍃 Database: ${MONGODB_URI.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB'}`);
  console.log(`💬 Socket.IO: Enabled for real-time messaging`);
});