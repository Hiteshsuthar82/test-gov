import { Response } from 'express';
import { attemptService } from '../services/attemptService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const attemptController = {
  start: async (req: AuthRequest, res: Response) => {
    try {
      const { testSetId, forceNew } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.startAttempt(userId, testSetId, forceNew === true);
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
      const { reason, questionId, timeSpentIncrementSeconds } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.submitAttempt(attemptId, userId, reason, questionId, timeSpentIncrementSeconds);
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
      const { sectionId, questionId, timeSpentIncrementSeconds } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.submitSection(attemptId, userId, sectionId, questionId, timeSpentIncrementSeconds);
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

  updateReview: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const { questionId, markedForReview, timeSpentIncrementSeconds } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.updateReview(attemptId, userId, questionId, markedForReview, timeSpentIncrementSeconds);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  getUserAttempts: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const { categoryId } = req.query;
      const attempts = await attemptService.getUserAttempts(
        userId, 
        categoryId as string | undefined
      );
      sendSuccess(res, attempts);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  pauseAttempt: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const { questionId, timeSpentIncrementSeconds } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.pauseAttempt(attemptId, userId, questionId, timeSpentIncrementSeconds);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  resumeAttempt: async (req: AuthRequest, res: Response) => {
    try {
      const { attemptId } = req.params;
      const { questionId, timeSpentIncrementSeconds } = req.body;
      const userId = req.user._id.toString();
      const result = await attemptService.resumeAttempt(attemptId, userId, questionId, timeSpentIncrementSeconds);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  getInProgressAttempts: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const { testSetId } = req.query;
      const attempts = await attemptService.getInProgressAttempts(
        userId,
        testSetId as string | undefined
      );
      sendSuccess(res, attempts);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

