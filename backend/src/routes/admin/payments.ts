import { Router } from 'express';
import { adminPaymentController } from '../../controllers/adminPaymentController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminPaymentController.getAll);
router.get('/:id', adminPaymentController.getById);
router.patch('/:id/approve', adminPaymentController.approve);
router.patch('/:id/reject', adminPaymentController.reject);

export default router;

