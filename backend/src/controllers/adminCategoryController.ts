import { Request, Response } from 'express';
import { adminCategoryService } from '../services/adminCategoryService';
import { sendSuccess, sendError } from '../utils/response';

export const adminCategoryController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminCategoryService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await adminCategoryService.getById(id);
      sendSuccess(res, category);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const category = await adminCategoryService.create(req.body);
      sendSuccess(res, category, 'Category created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await adminCategoryService.update(id, req.body);
      sendSuccess(res, category, 'Category updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminCategoryService.delete(id);
      sendSuccess(res, result, 'Category deactivated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

