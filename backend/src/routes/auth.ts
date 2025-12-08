import { Router } from 'express';
import { authController } from '../controllers/authController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { upload } from '../middleware/upload';
import { z } from 'zod';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    mobile: z.string().min(10),
    preparingForExam: z.string().optional(),
    deviceId: z.string().optional(),
    invitationCode: z.string().optional(),
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

const signupWebSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    mobile: z.string().min(10),
    preparingForExam: z.string().optional(),
    invitationCode: z.string().optional(),
  }),
});

const verifyOTPWebSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

// Mobile routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/send-otp', validate(sendOTPSchema), authController.sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);

// Web routes
router.post('/web/signup', validate(signupWebSchema), authController.signupWeb);
router.post('/web/send-otp', validate(sendOTPSchema), authController.sendOTP);
router.post('/web/verify-otp', validate(verifyOTPWebSchema), authController.verifyOTPWeb);

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    preparingForExam: z.string().optional(),
  }),
});

router.get('/me', studentAuthMiddleware, authController.me);
router.patch('/profile', studentAuthMiddleware, upload.single('profileImage'), validate(updateProfileSchema), authController.updateProfile);

export default router;

