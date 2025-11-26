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
};

