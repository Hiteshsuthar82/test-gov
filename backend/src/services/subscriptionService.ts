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
    const now = new Date();
    const categoryObjectId = new Types.ObjectId(categoryId);

    // Priority 1: Check for APPROVED direct category subscription
    const approvedCategorySubscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: categoryObjectId,
      isComboOffer: false,
      status: 'APPROVED',
    })
      .select('status startsAt expiresAt categoryId')
      .lean();

    // Check if approved category subscription is still valid (not expired)
    if (approvedCategorySubscription) {
      if (approvedCategorySubscription.expiresAt && new Date(approvedCategorySubscription.expiresAt) < now) {
        // Subscription expired - return EXPIRED status for UI logic
        return {
          status: 'EXPIRED',
          startsAt: approvedCategorySubscription.startsAt,
          expiresAt: approvedCategorySubscription.expiresAt,
        };
      }

      // Found valid APPROVED direct subscription - return it
      return {
        status: approvedCategorySubscription.status,
        startsAt: approvedCategorySubscription.startsAt,
        expiresAt: approvedCategorySubscription.expiresAt,
      };
    }

    // Priority 2: Check for APPROVED combo offer subscription that includes this category
    const approvedComboSubscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      isComboOffer: true,
      status: 'APPROVED',
      'comboOfferDetails.categoryIds': categoryObjectId,
    })
      .select('status startsAt expiresAt comboOfferDetails')
      .lean();

    // Check if approved combo subscription is still valid (not expired)
    if (approvedComboSubscription) {
      if (approvedComboSubscription.expiresAt && new Date(approvedComboSubscription.expiresAt) < now) {
        // Subscription expired - return EXPIRED status for UI logic
        return {
          status: 'EXPIRED',
          startsAt: approvedComboSubscription.startsAt,
          expiresAt: approvedComboSubscription.expiresAt,
        };
      }

      // Found valid APPROVED combo subscription - return it
      return {
        status: approvedComboSubscription.status,
        startsAt: approvedComboSubscription.startsAt,
        expiresAt: approvedComboSubscription.expiresAt,
      };
    }

    // Priority 3: If no APPROVED subscription found, check for any direct category subscription (for status display)
    // This is for showing PENDING_REVIEW or REJECTED status
    const anyCategorySubscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: categoryObjectId,
      isComboOffer: false,
    })
      .select('status startsAt expiresAt categoryId')
      .lean();

    if (anyCategorySubscription) {
      return {
        status: anyCategorySubscription.status,
        startsAt: anyCategorySubscription.startsAt,
        expiresAt: anyCategorySubscription.expiresAt,
      };
    }

    // No subscription found
    return null;
  },
};

