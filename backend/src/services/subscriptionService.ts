import { Subscription } from '../models/Subscription';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const subscriptionService = {
  async getUserSubscriptions(userId: string) {
    const subscriptions = await Subscription.find({
      userId: new Types.ObjectId(userId),
    })
      .populate('categoryId', 'name price bannerImageUrl')
      .populate('paymentReferenceId', 'amount status')
      .sort({ createdAt: -1 });

    return subscriptions;
  },

  async checkSubscription(userId: string, categoryId: string) {
    const subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(categoryId),
    })
      .populate('categoryId', 'name price bannerImageUrl')
      .populate('paymentReferenceId', 'amount status');

    return subscription;
  },
};

