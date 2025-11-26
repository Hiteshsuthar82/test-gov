import { Request, Response } from 'express';
import { Banner } from '../models/Banner';
import { sendSuccess, sendError } from '../utils/response';

export const bannerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const banners = await Banner.find({ isActive: true })
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('-__v');
      sendSuccess(res, banners);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

