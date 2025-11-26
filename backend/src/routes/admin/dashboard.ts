import { Router } from 'express';
import { adminDashboardController } from '../../controllers/adminDashboardController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminDashboardController.getStats);

export default router;

