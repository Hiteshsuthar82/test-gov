import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { studentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', studentAuthMiddleware, subscriptionController.getUserSubscriptions);
// Alias for easier access
router.get('/', studentAuthMiddleware, subscriptionController.getUserSubscriptions);
router.get('/check/:categoryId', studentAuthMiddleware, subscriptionController.checkSubscription);
// Alias for check-status endpoint
router.get('/check-status/:categoryId', studentAuthMiddleware, subscriptionController.checkSubscription);

export default router;

