import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { TestAttempt } from '../models/TestAttempt';

export const adminUserService = {
  async getAll(query: { page?: number; limit?: number; search?: string }) {
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

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v'),
      User.countDocuments(filter),
    ]);

    return {
      users,
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
    return Subscription.find({ userId })
      .populate('categoryId', 'name price')
      .populate('paymentReferenceId', 'amount status')
      .sort({ createdAt: -1 });
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

