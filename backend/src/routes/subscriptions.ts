import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { studentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', studentAuthMiddleware, subscriptionController.getUserSubscriptions);

export default router;

