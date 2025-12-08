import { Request, Response } from 'express';
import { partnerService } from '../services/partnerService';
import { sendSuccess, sendError } from '../utils/response';

export const partnerController = {
  validateCode: async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) {
        sendError(res, 'Code is required', 400);
        return;
      }

      const partner = await partnerService.validateCode(code);
      if (!partner) {
        sendError(res, 'Invalid or inactive invitation code', 404);
        return;
      }

      sendSuccess(res, {
        partnerId: partner._id,
        discountPercentage: partner.discountPercentage,
        partnerName: partner.name,
      });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const partners = await partnerService.getAll();
      sendSuccess(res, { partners });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const partner = await partnerService.getById(id);
      sendSuccess(res, partner);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const partner = await partnerService.create(req.body);
      sendSuccess(res, partner, 'Partner created successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const partner = await partnerService.update(id, req.body);
      sendSuccess(res, partner, 'Partner updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await partnerService.delete(id);
      sendSuccess(res, null, 'Partner deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

