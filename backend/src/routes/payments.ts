import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { studentAuthMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const createPaymentSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1),
    amount: z.number().positive(),
    payerName: z.string().min(1),
    payerUpiId: z.string().min(1),
    upiTransactionId: z.string().optional(),
    screenshotUrl: z.string().url(),
  }),
});

router.post(
  '/',
  studentAuthMiddleware,
  validate(createPaymentSchema),
  paymentController.create
);

export default router;

