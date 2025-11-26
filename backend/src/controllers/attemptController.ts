import { Response } from 'express';
import { attemptService } from '../services/attemptService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const attemptController = {
  start: async (req: AuthRequest, res: Response) => {
    try {
      const { testSetId } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.startAttempt(userId, testSetId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  updateAnswer: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user._id.toString();
      const result = await attemptService.updateAnswer(attemptId, userId, req.body);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  submit: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const { reason } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.submitAttempt(attemptId, userId, reason);
      sendSuccess(res, result, 'Test submitted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  getAttempt: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user._id.toString();
      const attempt = await attemptService.getAttempt(attemptId, userId);
      sendSuccess(res, attempt);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  getDeepDive: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user._id.toString();
      const result = await attemptService.getDeepDive(attemptId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  submitSection: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const { sectionId } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.submitSection(attemptId, userId, sectionId);
      sendSuccess(res, result, result.message);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  checkSectionTimer: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const userId = req.user._id.toString();
      const result = await attemptService.checkSectionTimer(attemptId, userId);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

