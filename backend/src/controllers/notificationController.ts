import { Response } from 'express';
import { notificationService } from '../services/notificationService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const notificationController = {
  getUserNotifications: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const result = await notificationService.getUserNotifications(userId, req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  updateFCMToken: async (req: AuthRequest, res: Response) => {
    try {
      const { fcmToken } = req.body;
      req.user.fcmToken = fcmToken;
      await req.user.save();
      sendSuccess(res, { fcmToken }, 'FCM token updated.');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

