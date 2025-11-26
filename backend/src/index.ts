import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import { initializeFirebase } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import adminAuthRoutes from './routes/adminAuth';
import bannerRoutes from './routes/banners';
import noticeRoutes from './routes/notices';
import categoryRoutes from './routes/categories';
import paymentRoutes from './routes/payments';
import subscriptionRoutes from './routes/subscriptions';
import testSetRoutes from './routes/testSets';
import attemptRoutes from './routes/attempts';
import leaderboardRoutes from './routes/leaderboard';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public/Student routes
app.use('/auth', authRoutes);
app.use('/banners', bannerRoutes);
app.use('/notices', noticeRoutes);
app.use('/categories', categoryRoutes);
app.use('/payments', paymentRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/sets', testSetRoutes);
app.use('/attempts', attemptRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/notifications', notificationRoutes);

// Admin routes
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminRoutes);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    initializeFirebase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

