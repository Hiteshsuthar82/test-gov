import { Request, Response } from 'express';
import { adminBannerService } from '../services/adminBannerService';
import { sendSuccess, sendError } from '../utils/response';

export const adminBannerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const banners = await adminBannerService.getAll();
      sendSuccess(res, banners);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const banner = await adminBannerService.create(req.body);
      sendSuccess(res, banner, 'Banner created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const banner = await adminBannerService.update(id, req.body);
      sendSuccess(res, banner, 'Banner updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminBannerService.delete(id);
      sendSuccess(res, result, 'Banner deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

