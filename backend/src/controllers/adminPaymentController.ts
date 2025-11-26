import { Request, Response } from 'express';
import { adminPaymentService } from '../services/adminPaymentService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const adminPaymentController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminPaymentService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const payment = await adminPaymentService.getById(id);
      sendSuccess(res, payment);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  approve: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminComment } = req.body;
      const adminId = req.admin._id.toString();
      const result = await adminPaymentService.approve(id, adminId, adminComment);
      sendSuccess(res, result, 'Payment approved successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  reject: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminComment } = req.body;
      if (!adminComment) {
        sendError(res, 'Admin comment is required for rejection', 400);
        return;
      }
      const adminId = req.admin._id.toString();
      const result = await adminPaymentService.reject(id, adminId, adminComment);
      sendSuccess(res, result, 'Payment rejected.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

