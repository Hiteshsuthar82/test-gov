import { Response } from 'express';
import { paymentService } from '../services/paymentService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { uploadToCloudinary, fetchAndUploadToCloudinary } from '../utils/cloudinary';

export const paymentController = {
  getConfig: async (req: any, res: Response) => {
    try {
      const upiId = process.env.UPI_ID || 'your-upi@paytm';
      sendSuccess(res, { upiId }, 'Payment configuration retrieved.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
  create: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      let screenshotUrl = req.body.screenshotUrl;

      // Handle file upload if provided
      if (req.file) {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'payments',
          `payment-${Date.now()}`
        );
        screenshotUrl = uploadResult.secure_url;
      } 
      // If screenshotUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.screenshotUrl && typeof req.body.screenshotUrl === 'string' && req.body.screenshotUrl.trim()) {
        if (!req.body.screenshotUrl.includes('cloudinary.com')) {
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.screenshotUrl,
            'payments',
            `payment-${Date.now()}`
          );
          screenshotUrl = uploadResult.secure_url;
        }
      }

      if (!screenshotUrl) {
        return sendError(res, 'Payment screenshot is required', 400);
      }

      const result = await paymentService.create({
        categoryId: req.body.categoryId, // For backward compatibility
        categoryIds: req.body.categoryIds, // For multiple categories
        cartId: req.body.cartId, // For cart payment
        comboOfferId: req.body.comboOfferId, // For combo offer payment
        comboDurationMonths: req.body.comboDurationMonths ? parseInt(req.body.comboDurationMonths) : undefined,
        categoryDurationMonths: req.body.categoryDurationMonths ? parseInt(req.body.categoryDurationMonths) : undefined, // For single category with time periods
        amount: parseFloat(req.body.amount),
        payerName: req.body.payerName,
        payerUpiId: req.body.payerUpiId,
        upiTransactionId: req.body.upiTransactionId,
        screenshotUrl,
        userId,
      });
      sendSuccess(res, result, 'Payment submitted for review.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

