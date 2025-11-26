import { Response } from 'express';
import { adminAuthService } from '../services/adminAuthService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const adminAuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        sendError(res, 'Email and password are required', 400);
        return;
      }
      const result = await adminAuthService.login(email, password);
      sendSuccess(res, result, 'Login successful.');
    } catch (error: any) {
      sendError(res, error.message, 401);
    }
  },

  me: async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.admin;
      sendSuccess(res, {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },
};

