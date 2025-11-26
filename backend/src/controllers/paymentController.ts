import { Response } from 'express';
import { paymentService } from '../services/paymentService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const paymentController = {
  create: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const result = await paymentService.create({
        ...req.body,
        userId,
      });
      sendSuccess(res, result, 'Payment submitted for review.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

