import { User } from '../models/User';
import { Category } from '../models/Category';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { TestAttempt } from '../models/TestAttempt';

export const adminDashboardService = {
  async getStats() {
    const [
      totalUsers,
      totalCategories,
      subscriptionsByStatus,
      totalRevenue,
      pendingPayments,
      recentPayments,
      recentAttempts,
    ] = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Subscription.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: { status: 'APPROVED' },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      Payment.countDocuments({ status: 'PENDING_REVIEW' }),
      Payment.find()
        .populate('userId', 'name email')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('-__v'),
      TestAttempt.find({ status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] } })
        .populate('userId', 'name email')
        .populate('testSetId', 'name')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('-questions -__v'),
    ]);

    const subscriptionsMap: Record<string, number> = {};
    subscriptionsByStatus.forEach((item) => {
      subscriptionsMap[item._id] = item.count;
    });

    return {
      totalUsers,
      totalCategories,
      subscriptions: {
        approved: subscriptionsMap['APPROVED'] || 0,
        pending: subscriptionsMap['PENDING_REVIEW'] || 0,
        rejected: subscriptionsMap['REJECTED'] || 0,
        total: Object.values(subscriptionsMap).reduce((a, b) => a + b, 0),
      },
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingPayments,
      recentPayments,
      recentAttempts,
    };
  },
};

