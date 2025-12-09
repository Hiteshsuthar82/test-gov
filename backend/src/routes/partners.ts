import { Router } from 'express';
import { partnerController } from '../controllers/partnerController';
import { adminAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const validateCodeSchema = z.object({
  body: z.object({
    code: z.string().min(1),
  }),
});

const createPartnerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    businessName: z.string().min(1),
    mobile: z.string().min(10),
    code: z.string().min(1),
    discountPercentage: z.number().min(0).max(100),
  }),
});

const updatePartnerSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    businessName: z.string().min(1).optional(),
    mobile: z.string().min(10).optional(),
    code: z.string().min(1).optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Public route for validating invitation codes
router.post('/validate-code', validate(validateCodeSchema), partnerController.validateCode);

// Admin routes
router.use(adminAuthMiddleware);
router.get('/', partnerController.getAll);
router.get('/:id', partnerController.getById);
router.post('/', validate(createPartnerSchema), partnerController.create);
router.patch('/:id', validate(updatePartnerSchema), partnerController.update);
router.delete('/:id', partnerController.delete);

export default router;

