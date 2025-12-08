import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { notificationService } from './notificationService';
import { Types } from 'mongoose';

export const adminPaymentService = {
  async getAll(query: {
    status?: string;
    categoryId?: string;
    partnerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }
    
    // Filter by partnerId - need to find users with this partnerId first
    if (query.partnerId) {
      const usersWithPartner = await User.find({ partnerId: query.partnerId }).select('_id');
      const userIds = usersWithPartner.map(u => u._id);
      if (userIds.length > 0) {
        filter.userId = { $in: userIds };
      } else {
        // No users with this partner, return empty result
        filter.userId = { $in: [] };
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate({
          path: 'userId',
          select: 'name email mobile',
          populate: {
            path: 'partnerId',
            select: 'name businessName code discountPercentage'
          }
        })
        .populate('categoryId', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const payment = await Payment.findById(id)
      .populate('userId', 'name email mobile')
      .populate('categoryId', 'name price');
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  },

  async approve(id: string, adminId: string, adminComment?: string) {
    const payment = await Payment.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'APPROVED';
    if (adminComment) {
      payment.adminComment = adminComment;
    }
    await payment.save();

    // Update subscription
    const subscription = await Subscription.findOne({
      userId: payment.userId,
      categoryId: payment.categoryId,
    });

    if (subscription) {
      subscription.status = 'APPROVED';
      subscription.paymentReferenceId = payment._id;
      subscription.startsAt = new Date();
      // Optional: set expiry (e.g., 1 year from now)
      subscription.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await subscription.save();
    }

    // Send notification
    try {
      await notificationService.sendNotification({
        title: 'Payment Approved',
        message: `Your payment for ${(payment.categoryId as any)?.name || 'category'} has been approved. You can now access all test sets.`,
        type: 'payment_approved',
        target: 'USER',
        userId: payment.userId.toString(),
        createdByAdminId: adminId,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return { payment, subscription };
  },

  async reject(id: string, adminId: string, adminComment: string) {
    const payment = await Payment.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'REJECTED';
    payment.adminComment = adminComment;
    await payment.save();

    // Update subscription
    const subscription = await Subscription.findOne({
      userId: payment.userId,
      categoryId: payment.categoryId,
    });

    if (subscription) {
      subscription.status = 'REJECTED';
      subscription.paymentReferenceId = payment._id;
      await subscription.save();
    }

    return { payment, subscription };
  },
};

