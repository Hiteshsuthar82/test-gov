import { Router } from 'express';
import { adminCartController } from '../../controllers/adminCartController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminCartController.getAll);
router.get('/:id', adminCartController.getById);
router.get('/user/:userId', adminCartController.getByUserId);

export default router;

