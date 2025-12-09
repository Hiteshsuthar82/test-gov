import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { Types } from 'mongoose';

export const adminSubscriptionService = {
  async getAll(query: {
    status?: string;
    categoryId?: string;
    userId?: string;
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
      filter.categoryId = query.categoryId;
    }
    if (query.userId) {
      filter.userId = query.userId;
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

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate({
          path: 'userId',
          select: 'name email',
          populate: {
            path: 'partnerId',
            select: 'name businessName code discountPercentage'
          }
        })
        .populate('categoryId', 'name price')
        .populate('paymentReferenceId', 'amount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscription.countDocuments(filter),
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const subscription = await Subscription.findById(id)
      .populate('userId', 'name email mobile')
      .populate('categoryId', 'name price')
      .populate('paymentReferenceId');
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  },

  async update(id: string, data: {
    status?: string;
    startsAt?: Date;
    expiresAt?: Date;
  }) {
    const subscription = await Subscription.findByIdAndUpdate(id, data, { new: true });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  },
};

