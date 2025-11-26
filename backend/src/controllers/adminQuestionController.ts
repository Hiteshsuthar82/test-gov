import { Request, Response } from 'express';
import { adminQuestionService } from '../services/adminQuestionService';
import { sendSuccess, sendError } from '../utils/response';

export const adminQuestionController = {
  getByTestSet: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const questions = await adminQuestionService.getByTestSet(setId);
      sendSuccess(res, questions);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const question = await adminQuestionService.getById(id);
      sendSuccess(res, question);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const question = await adminQuestionService.create(setId, req.body);
      sendSuccess(res, question, 'Question created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const question = await adminQuestionService.update(id, req.body);
      sendSuccess(res, question, 'Question updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await adminQuestionService.delete(id);
      sendSuccess(res, result, 'Question deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  bulkCreate: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const { questions } = req.body;
      const created = await adminQuestionService.bulkCreate(setId, questions);
      sendSuccess(res, created, 'Questions created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

