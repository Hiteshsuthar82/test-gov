import { Request, Response } from 'express';
import { adminLeaderboardService } from '../services/adminLeaderboardService';
import { sendSuccess, sendError } from '../utils/response';

export const adminLeaderboardController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminLeaderboardService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  recalculateRanks: async (req: Request, res: Response) => {
    try {
      const { categoryId, testSetId } = req.body;
      if (!categoryId) {
        sendError(res, 'categoryId is required', 400);
        return;
      }
      const result = await adminLeaderboardService.recalculateRanks(categoryId, testSetId);
      sendSuccess(res, result, 'Ranks recalculated successfully');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  deleteEntry: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await adminLeaderboardService.deleteEntry(id);
      sendSuccess(res, null, 'Leaderboard entry deleted and ranks recalculated');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

