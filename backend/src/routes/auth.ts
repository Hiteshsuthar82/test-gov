import { Router } from 'express';
import { authController } from '../controllers/authController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    mobile: z.string().min(10),
    preparingForExam: z.string().optional(),
    deviceId: z.string().optional(),
  }),
});

const sendOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    deviceId: z.string().min(1),
    fcmToken: z.string().optional(),
  }),
});

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/send-otp', validate(sendOTPSchema), authController.sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);
router.get('/me', studentAuthMiddleware, authController.me);

export default router;

