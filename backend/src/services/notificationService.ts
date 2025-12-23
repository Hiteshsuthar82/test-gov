import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { sendFCMNotification } from '../utils/fcm';
import { Types } from 'mongoose';

export const notificationService = {
  async sendNotification(data: {
    title: string;
    message: string;
    type: 'general' | 'category' | 'testSet' | 'notice' | 'payment_approved' | 'payment_rejected';
    target: 'ALL' | 'CATEGORY_USERS' | 'USER';
    categoryId?: string;
    testSetId?: string;
    userId?: string;
    createdByAdminId: string;
  }) {
    let targetUsers: any[] = [];

    if (data.target === 'ALL') {
      targetUsers = await User.find({ isBlocked: false, fcmToken: { $exists: true, $ne: null } });
    } else if (data.target === 'CATEGORY_USERS') {
      if (!data.categoryId) {
        throw new Error('categoryId is required for CATEGORY_USERS target');
      }
      // Get both direct category subscriptions and combo offer subscriptions
      const [directSubscriptions, comboSubscriptions] = await Promise.all([
        Subscription.find({
          categoryId: new Types.ObjectId(data.categoryId),
          isComboOffer: false,
          status: 'APPROVED',
        }),
        Subscription.find({
          isComboOffer: true,
          status: 'APPROVED',
          'comboOfferDetails.categoryIds': new Types.ObjectId(data.categoryId),
        }),
      ]);
      
      // Combine user IDs from both subscription types
      const userIds = [
        ...directSubscriptions.map((s) => s.userId),
        ...comboSubscriptions.map((s) => s.userId),
      ];
      
      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
      
      targetUsers = await User.find({
        _id: { $in: uniqueUserIds },
        isBlocked: false,
        fcmToken: { $exists: true, $ne: null },
      });
    } else if (data.target === 'USER') {
      if (!data.userId) {
        throw new Error('userId is required for USER target');
      }
      const user = await User.findById(data.userId);
      if (user && !user.isBlocked && user.fcmToken) {
        targetUsers = [user];
      }
    }

    const fcmTokens = targetUsers.map((u) => u.fcmToken).filter(Boolean);
    const sentToUserIds = targetUsers.map((u) => u._id);

    // Send FCM notifications
    if (fcmTokens.length > 0) {
      await sendFCMNotification(fcmTokens, {
        title: data.title,
        body: data.message,
        data: {
          type: data.type,
          categoryId: data.categoryId || '',
          testSetId: data.testSetId || '',
        },
      });
    }

    // Save notification
    const notification = await Notification.create({
      title: data.title,
      message: data.message,
      type: data.type,
      categoryId: data.categoryId ? new Types.ObjectId(data.categoryId) : undefined,
      testSetId: data.testSetId ? new Types.ObjectId(data.testSetId) : undefined,
      userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
      target: data.target,
      sentTo: sentToUserIds,
      createdByAdminId: new Types.ObjectId(data.createdByAdminId),
    });

    return {
      notification,
      sentTo: sentToUserIds.length,
      fcmSent: fcmTokens.length,
    };
  },

  async getUserNotifications(userId: string, query: { page?: number; limit?: number }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    // Get user's subscriptions (both direct and combo offers)
    const subscriptions = await Subscription.find({
      userId: new Types.ObjectId(userId),
      status: 'APPROVED',
    });
    
    // Extract category IDs from direct subscriptions
    const directCategoryIds = subscriptions
      .filter(s => !s.isComboOffer && s.categoryId)
      .map((s) => s.categoryId);
    
    // Extract category IDs from combo offer subscriptions
    const comboCategoryIds: Types.ObjectId[] = [];
    subscriptions
      .filter(s => s.isComboOffer && s.comboOfferDetails?.categoryIds)
      .forEach(s => {
        const categoryIds = s.comboOfferDetails?.categoryIds || [];
        categoryIds.forEach((catId: any) => {
          if (catId && !comboCategoryIds.some(id => id.toString() === catId.toString())) {
            comboCategoryIds.push(catId instanceof Types.ObjectId ? catId : new Types.ObjectId(catId));
          }
        });
      });
    
    // Combine all category IDs
    const categoryIds = [...directCategoryIds, ...comboCategoryIds];

    const notifications = await Notification.find({
      $or: [
        { target: 'ALL' },
        { target: 'CATEGORY_USERS', categoryId: { $in: categoryIds } },
        { target: 'USER', userId: new Types.ObjectId(userId) },
        { sentTo: new Types.ObjectId(userId) },
      ],
    })
      .populate('categoryId', 'name')
      .populate('testSetId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      $or: [
        { target: 'ALL' },
        { target: 'CATEGORY_USERS', categoryId: { $in: categoryIds } },
        { target: 'USER', userId: new Types.ObjectId(userId) },
        { sentTo: new Types.ObjectId(userId) },
      ],
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};

