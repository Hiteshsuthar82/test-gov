import { Router } from 'express';
import { cartController } from '../controllers/cartController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const addItemSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1),
    selectedDurationMonths: z.number().optional(),
  }),
});

const updateDurationSchema = z.object({
  body: z.object({
    newDurationMonths: z.number().min(1),
  }),
});

router.use(studentAuthMiddleware);

router.get('/', cartController.getCart);
router.post('/', validate(addItemSchema), cartController.addItem);
router.patch('/items/:categoryId/duration', validate(updateDurationSchema), cartController.updateItemDuration);
router.delete('/items/:categoryId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;

