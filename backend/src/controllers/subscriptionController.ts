import { Response } from 'express';
import { subscriptionService } from '../services/subscriptionService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const subscriptionController = {
  getUserSubscriptions: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const subscriptions = await subscriptionService.getUserSubscriptions(userId);
      sendSuccess(res, subscriptions);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  checkSubscription: async (req: AuthRequest, res: Response) => {
    try {
      // If user is not authenticated, return null
      if (!req.user) {
        return sendSuccess(res, null);
      }
      const userId = req.user._id.toString();
      const { categoryId } = req.params;
      const subscription = await subscriptionService.checkSubscription(userId, categoryId);
      sendSuccess(res, subscription);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

