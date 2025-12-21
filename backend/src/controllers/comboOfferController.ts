import { Response } from 'express';
import { comboOfferService } from '../services/comboOfferService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const comboOfferController = {
  getAll: async (req: AuthRequest, res: Response) => {
    try {
      const result = await comboOfferService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getActiveForCategory: async (req: any, res: Response) => {
    try {
      const { categoryId } = req.params;
      const offers = await comboOfferService.getActiveOffersForCategory(categoryId);
      sendSuccess(res, offers);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const comboOffer = await comboOfferService.getById(id);
      sendSuccess(res, comboOffer);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

