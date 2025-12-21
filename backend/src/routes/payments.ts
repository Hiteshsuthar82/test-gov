import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { studentAuthMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const createPaymentSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1).optional(), // Optional for cart/combo payments
    categoryIds: z.array(z.string().min(1)).optional(), // For multiple categories
    cartId: z.string().min(1).optional(), // For cart payment
    comboOfferId: z.string().min(1).optional(), // For combo offer payment
    comboDurationMonths: z.number().int().positive().optional(), // Duration in months for combo offer
    amount: z.number().positive(),
    payerName: z.string().min(1),
    payerUpiId: z.string().min(1),
    upiTransactionId: z.string().optional(),
    screenshotUrl: z.string().url().optional(),
  }).refine(
    (data) => data.categoryId || (data.categoryIds && data.categoryIds.length > 0) || data.cartId || data.comboOfferId,
    {
      message: "Either categoryId, categoryIds, cartId, or comboOfferId must be provided",
    }
  ),
});

router.get(
  '/config',
  paymentController.getConfig
);

router.post(
  '/',
  studentAuthMiddleware,
  upload.single('screenshot'),
  paymentController.create
);

export default router;

