import { Response } from 'express';
import { adminDashboardService } from '../services/adminDashboardService';
import { sendSuccess, sendError } from '../utils/response';

export const adminDashboardController = {
  getStats: async (req: Request, res: Response) => {
    try {
      const stats = await adminDashboardService.getStats();
      sendSuccess(res, stats);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

