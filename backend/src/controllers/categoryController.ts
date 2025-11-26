import { Request, Response } from 'express';
import { categoryService } from '../services/categoryService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const categoryController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await categoryService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getDetails: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?._id?.toString();
      const result = await categoryService.getDetails(id, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

