import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const updateFCMTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(1),
  }),
});

router.get('/', studentAuthMiddleware, notificationController.getUserNotifications);
router.post('/fcm-token', studentAuthMiddleware, validate(updateFCMTokenSchema), notificationController.updateFCMToken);

export default router;

