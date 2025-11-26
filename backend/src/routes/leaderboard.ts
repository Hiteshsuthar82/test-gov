import { Router } from 'express';
import { leaderboardController } from '../controllers/leaderboardController';

const router = Router();

router.get('/', leaderboardController.getLeaderboard);

export default router;

