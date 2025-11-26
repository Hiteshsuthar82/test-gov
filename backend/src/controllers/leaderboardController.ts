import { Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboardService';
import { sendSuccess, sendError } from '../utils/response';

export const leaderboardController = {
  getLeaderboard: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.query;
      if (!categoryId) {
        sendError(res, 'categoryId is required', 400);
        return;
      }
      const result = await leaderboardService.getLeaderboard(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

