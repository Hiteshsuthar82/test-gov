import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { Notification } from '../models/Notification';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const adminNotificationController = {
  send: async (req: AuthRequest, res: Response) => {
    try {
      const adminId = req.admin._id.toString();
      const result = await notificationService.sendNotification({
        ...req.body,
        createdByAdminId: adminId,
      });
      sendSuccess(res, result, 'Notification sent successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page?.toString() || '1', 10);
      const limit = parseInt(req.query.limit?.toString() || '20', 10);
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find()
          .populate('categoryId', 'name')
          .populate('testSetId', 'name')
          .populate('userId', 'name email')
          .populate('createdByAdminId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(),
      ]);

      sendSuccess(res, {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

