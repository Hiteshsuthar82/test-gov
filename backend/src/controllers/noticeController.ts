import { Request, Response } from 'express';
import { Notice } from '../models/Notice';
import { sendSuccess, sendError } from '../utils/response';

export const noticeController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const { active } = req.query;
      const now = new Date();

      const query: any = {};
      if (active === 'true') {
        query.isActive = true;
        query.$or = [
          { validFrom: { $exists: false }, validTo: { $exists: false } },
          { validFrom: { $lte: now }, validTo: { $gte: now } },
          { validFrom: { $lte: now }, validTo: { $exists: false } },
          { validFrom: { $exists: false }, validTo: { $gte: now } },
        ];
      }

      const notices = await Notice.find(query)
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('-__v');
      sendSuccess(res, notices);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

