import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { User } from '../models/User';
import { AdminUser } from '../models/AdminUser';

export interface AuthRequest extends Request {
  user?: any;
  admin?: any;
}

export const studentAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as JwtPayload;

    if (decoded.role !== 'STUDENT' || !decoded.userId) {
      sendError(res, 'Invalid token', 401);
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.isBlocked) {
      sendError(res, 'User not found or blocked', 401);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as JwtPayload;

    if (decoded.role !== 'ADMIN' || !decoded.adminId) {
      sendError(res, 'Invalid token', 401);
      return;
    }

    const admin = await AdminUser.findById(decoded.adminId);
    if (!admin) {
      sendError(res, 'Admin not found', 401);
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

// Optional auth middleware - doesn't fail if no token
export const optionalStudentAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as JwtPayload;

    if (decoded.role === 'STUDENT' && decoded.userId) {
      const user = await User.findById(decoded.userId);
      if (user && !user.isBlocked) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Invalid token, but continue without user
    next();
  }
};

