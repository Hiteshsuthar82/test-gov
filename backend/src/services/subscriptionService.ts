import { Subscription } from '../models/Subscription';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const subscriptionService = {
  async getUserSubscriptions(userId: string) {
    const subscriptions = await Subscription.find({
      userId: new Types.ObjectId(userId),
    })
      .populate('categoryId', 'name price bannerImageUrl')
      .populate('comboOfferId', 'name description imageUrl')
      .populate('paymentReferenceId', 'amount status')
      .sort({ createdAt: -1 });

    // Populate categoryIds in comboOfferDetails for combo offer subscriptions
    for (const subscription of subscriptions) {
      if (subscription.isComboOffer && subscription.comboOfferDetails?.categoryIds) {
        const categoryIds = subscription.comboOfferDetails.categoryIds;
        const populatedCategories = await Category.find({
          _id: { $in: categoryIds }
        }).select('name price bannerImageUrl');
        
        // Replace ObjectIds with populated category objects
        subscription.comboOfferDetails.categoryIds = populatedCategories as any;
      }
    }

    return subscriptions;
  },

  async checkSubscription(userId: string, categoryId: string) {
    // Check for direct category subscription
    const categorySubscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(categoryId),
      isComboOffer: false,
    })
      .select('status startsAt expiresAt categoryId')
      .lean();

    if (categorySubscription) {
      return {
        status: categorySubscription.status,
        startsAt: categorySubscription.startsAt,
        expiresAt: categorySubscription.expiresAt,
      };
    }

    // Check for combo offer subscription that includes this category
    const comboSubscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      isComboOffer: true,
      status: 'APPROVED',
      'comboOfferDetails.categoryIds': new Types.ObjectId(categoryId),
    })
      .select('status startsAt expiresAt comboOfferDetails')
      .lean();

    if (comboSubscription) {
      // Check if subscription is still valid (not expired)
      const now = new Date();
      if (comboSubscription.expiresAt && new Date(comboSubscription.expiresAt) < now) {
        return null; // Subscription expired
      }

      return {
        status: comboSubscription.status,
        startsAt: comboSubscription.startsAt,
        expiresAt: comboSubscription.expiresAt,
      };
    }

    return null;
  },
};

