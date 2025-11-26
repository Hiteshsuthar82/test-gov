import { Request, Response } from 'express';
import { adminNoticeService } from '../services/adminNoticeService';
import { sendSuccess, sendError } from '../utils/response';

export const adminNoticeController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const notices = await adminNoticeService.getAll();
      sendSuccess(res, notices);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const notice = await adminNoticeService.create(req.body);
      sendSuccess(res, notice, 'Notice created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const notice = await adminNoticeService.update(id, req.body);
      sendSuccess(res, notice, 'Notice updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminNoticeService.delete(id);
      sendSuccess(res, result, 'Notice deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

