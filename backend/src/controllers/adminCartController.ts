import { Request, Response } from 'express';
import { adminCartService } from '../services/adminCartService';
import { sendSuccess, sendError } from '../utils/response';

export const adminCartController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminCartService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cart = await adminCartService.getById(id);
      sendSuccess(res, cart);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  getByUserId: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const cart = await adminCartService.getByUserId(userId);
      if (!cart) {
        return sendSuccess(res, null, 'Cart not found');
      }
      sendSuccess(res, cart);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

