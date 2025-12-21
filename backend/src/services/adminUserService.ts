import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { TestAttempt } from '../models/TestAttempt';

export const adminUserService = {
  async getAll(query: { page?: number; limit?: number; search?: string; partnerId?: string }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { mobile: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.partnerId) {
      filter.partnerId = query.partnerId;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('partnerId', 'name businessName code discountPercentage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  async blockUser(id: string, isBlocked: boolean) {
    const user = await User.findByIdAndUpdate(id, { isBlocked }, { new: true });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },

  async getUserSubscriptions(userId: string) {
    const subscriptions = await Subscription.find({ userId })
      .populate('categoryId', 'name price')
      .populate('comboOfferId', 'name description imageUrl')
      .populate('paymentReferenceId', 'amount status')
      .sort({ createdAt: -1 });

    // Manually populate categoryIds in comboOfferDetails for combo offer subscriptions
    const { Category } = await import('../models/Category');
    for (const subscription of subscriptions) {
      if (subscription.isComboOffer && subscription.comboOfferDetails?.categoryIds) {
        const categoryIds = subscription.comboOfferDetails.categoryIds;
        const populatedCategories = await Category.find({
          _id: { $in: categoryIds }
        }).select('name price');
        subscription.comboOfferDetails.categoryIds = populatedCategories as any;
      }
    }

    return subscriptions;
  },

  async getUserAttempts(userId: string) {
    return TestAttempt.find({ userId })
      .populate('testSetId', 'name')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .select('-questions')
      .limit(50);
  },
};

