import { Router } from 'express';
import { adminAuthController } from '../controllers/adminAuthController';
import { adminAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

router.post('/login', validate(loginSchema), adminAuthController.login);
router.get('/me', adminAuthMiddleware, adminAuthController.me);

export default router;

