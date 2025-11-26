import { Request, Response } from 'express';
import { adminSubscriptionService } from '../services/adminSubscriptionService';
import { sendSuccess, sendError } from '../utils/response';

export const adminSubscriptionController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminSubscriptionService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscription = await adminSubscriptionService.getById(id);
      sendSuccess(res, subscription);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const subscription = await adminSubscriptionService.update(id, req.body);
      sendSuccess(res, subscription, 'Subscription updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

