import { Router } from 'express';
import dashboardRoutes from './dashboard';
import bannerRoutes from './banners';
import noticeRoutes from './notices';
import categoryRoutes from './categories';
import setRoutes from './sets';
import questionRoutes from './questions';
import userRoutes from './users';
import paymentRoutes from './payments';
import subscriptionRoutes from './subscriptions';
import notificationRoutes from './notifications';
import uploadRoutes from './upload';
import partnerRoutes from '../partners';
import leaderboardRoutes from './leaderboard';

const router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/banners', bannerRoutes);
router.use('/notices', noticeRoutes);
router.use('/categories', categoryRoutes);
router.use('/sets', setRoutes);
router.use('/questions', questionRoutes);
router.use('/users', userRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/upload', uploadRoutes);
router.use('/partners', partnerRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;

