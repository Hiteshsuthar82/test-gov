import { Router } from 'express';
import { adminNotificationController } from '../../controllers/adminNotificationController';
import { adminAuthMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

router.use(adminAuthMiddleware);

const sendNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.enum(['general', 'category', 'testSet', 'notice', 'payment_approved']),
    target: z.enum(['ALL', 'CATEGORY_USERS', 'USER']),
    categoryId: z.string().optional(),
    testSetId: z.string().optional(),
    userId: z.string().optional(),
  }),
});

router.post('/send', validate(sendNotificationSchema), adminNotificationController.send);
router.get('/', adminNotificationController.getAll);

export default router;

