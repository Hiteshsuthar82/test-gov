import { Request, Response } from 'express';
import { comboOfferService } from '../services/comboOfferService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const adminComboOfferController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await comboOfferService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const comboOffer = await comboOfferService.getById(id);
      sendSuccess(res, comboOffer);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      const comboOffer = await comboOfferService.create(req.body);
      sendSuccess(res, comboOffer, 'Combo offer created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const comboOffer = await comboOfferService.update(id, req.body);
      sendSuccess(res, comboOffer, 'Combo offer updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await comboOfferService.delete(id);
      sendSuccess(res, result, 'Combo offer deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

