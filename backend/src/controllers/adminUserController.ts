import { Request, Response } from 'express';
import { adminUserService } from '../services/adminUserService';
import { sendSuccess, sendError } from '../utils/response';

export const adminUserController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminUserService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await adminUserService.getById(id);
      sendSuccess(res, user);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  blockUser: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const user = await adminUserService.blockUser(id, isBlocked);
      sendSuccess(res, user, `User ${isBlocked ? 'blocked' : 'unblocked'} successfully.`);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  getUserSubscriptions: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscriptions = await adminUserService.getUserSubscriptions(id);
      sendSuccess(res, subscriptions);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getUserAttempts: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const attempts = await adminUserService.getUserAttempts(id);
      sendSuccess(res, attempts);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

