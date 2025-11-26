import { Router } from 'express';
import { adminUserController } from '../../controllers/adminUserController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminUserController.getAll);
router.get('/:id', adminUserController.getById);
router.patch('/:id/block', adminUserController.blockUser);
router.get('/:id/subscriptions', adminUserController.getUserSubscriptions);
router.get('/:id/attempts', adminUserController.getUserAttempts);

export default router;

