import { Response } from 'express';
import { testSetService } from '../services/testSetService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const testSetController = {
  getSetsByCategory: async (req: AuthRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      const userId = req.user._id.toString();
      const sets = await testSetService.getSetsByCategory(categoryId, userId);
      sendSuccess(res, sets);
    } catch (error: any) {
      sendError(res, error.message, 403);
    }
  },

  getSetDetails: async (req: AuthRequest, res: Response) => {
    try {
      const { setId } = req.params;
      const userId = req.user._id.toString();
      const result = await testSetService.getSetDetails(setId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  getUserAttempts: async (req: AuthRequest, res: Response) => {
    try {
      const { setId } = req.params;
      const userId = req.user._id.toString();
      const attempts = await testSetService.getUserAttempts(setId, userId);
      sendSuccess(res, attempts);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

