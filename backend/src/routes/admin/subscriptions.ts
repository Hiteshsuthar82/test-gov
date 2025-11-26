import { Router } from 'express';
import { adminSubscriptionController } from '../../controllers/adminSubscriptionController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminSubscriptionController.getAll);
router.get('/:id', adminSubscriptionController.getById);
router.patch('/:id', adminSubscriptionController.update);

export default router;

