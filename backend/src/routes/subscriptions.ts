import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { studentAuthMiddleware, optionalStudentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', studentAuthMiddleware, subscriptionController.getUserSubscriptions);
// Alias for easier access
router.get('/', studentAuthMiddleware, subscriptionController.getUserSubscriptions);
router.get('/check/:categoryId', optionalStudentAuthMiddleware, subscriptionController.checkSubscription);
// Alias for check-status endpoint
router.get('/check-status/:categoryId', optionalStudentAuthMiddleware, subscriptionController.checkSubscription);

export default router;

