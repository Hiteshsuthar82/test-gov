import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  data?: T,
  message?: string,
  errors?: any
): Response => {
  const response: ApiResponse<T> = { success };
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response => {
  return sendResponse(res, statusCode, true, data, message);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: any
): Response => {
  return sendResponse(res, statusCode, false, undefined, message, errors);
};

