import { Response } from 'express';
import { testSetService } from '../services/testSetService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const testSetController = {
  getSetsByCategory: async (req: AuthRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      const userId = req.user._id.toString();
      const { page, limit, sectionId, subsectionId } = req.query;
      const result = await testSetService.getSetsByCategory(
        categoryId, 
        userId,
        {
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
          sectionId: sectionId as string | undefined,
          subsectionId: subsectionId as string | undefined,
        }
      );
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 403);
    }
  },

  getSetDetails: async (req: AuthRequest, res: Response) => {
    try {
      const { setId } = req.params;
      const userId = req.user._id.toString();
      const result = await testSetService.getSetDetails(setId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  getUserAttempts: async (req: AuthRequest, res: Response) => {
    try {
      const { setId } = req.params;
      const userId = req.user._id.toString();
      const attempts = await testSetService.getUserAttempts(setId, userId);
      sendSuccess(res, attempts);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getSetsByCategoryPublic: async (req: AuthRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      const userId = req.user?._id?.toString(); // Optional - user might not be authenticated
      const { page, limit, sectionId, subsectionId } = req.query;
      const result = await testSetService.getSetsByCategoryPublic(
        categoryId, 
        userId || undefined, // Pass undefined if no user
        {
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
          sectionId: sectionId as string | undefined,
          subsectionId: subsectionId as string | undefined,
        }
      );
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

