import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  signup: async (req: Request, res: Response) => {
    try {
      const result = await authService.signup(req.body);
      sendSuccess(res, result, 'Signup successful. OTP sent to email.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  sendOTP: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        sendError(res, 'Email is required', 400);
        return;
      }
      const result = await authService.sendOTP(email);
      sendSuccess(res, result, 'OTP sent to email.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  verifyOTP: async (req: Request, res: Response) => {
    try {
      const result = await authService.verifyOTP(req.body);
      sendSuccess(res, result, 'Login successful.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  me: async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;
      sendSuccess(res, {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        preparingForExam: user.preparingForExam,
        deviceId: user.deviceId,
      });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  signupWeb: async (req: Request, res: Response) => {
    try {
      const result = await authService.signupWeb(req.body);
      sendSuccess(res, result, 'Signup successful. OTP sent to email.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  verifyOTPWeb: async (req: Request, res: Response) => {
    try {
      const result = await authService.verifyOTPWeb(req.body);
      sendSuccess(res, result, 'Login successful.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

