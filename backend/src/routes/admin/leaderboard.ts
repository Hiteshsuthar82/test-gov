import { Router } from 'express';
import { adminLeaderboardController } from '../../controllers/adminLeaderboardController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminLeaderboardController.getAll);
router.post('/recalculate', adminLeaderboardController.recalculateRanks);
router.delete('/:id', adminLeaderboardController.deleteEntry);

export default router;

