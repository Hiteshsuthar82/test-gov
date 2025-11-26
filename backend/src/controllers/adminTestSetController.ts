import { Request, Response } from 'express';
import { adminTestSetService } from '../services/adminTestSetService';
import { sendSuccess, sendError } from '../utils/response';

export const adminTestSetController = {
  getByCategory: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const sets = await adminTestSetService.getByCategory(categoryId);
      sendSuccess(res, sets);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const set = await adminTestSetService.getById(id);
      sendSuccess(res, set);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const set = await adminTestSetService.create(categoryId, req.body);
      sendSuccess(res, set, 'Test set created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const set = await adminTestSetService.update(id, req.body);
      sendSuccess(res, set, 'Test set updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminTestSetService.delete(id);
      sendSuccess(res, result, 'Test set deactivated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

