import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { Cart } from '../models/Cart';
import { ComboOffer } from '../models/ComboOffer';
import { Types } from 'mongoose';

export const paymentService = {
  async create(data: {
    userId: string;
    categoryId?: string;
    categoryIds?: string[];
    cartId?: string;
    comboOfferId?: string;
    comboDurationMonths?: number;
    amount: number;
    payerName: string;
    payerUpiId: string;
    upiTransactionId?: string;
    screenshotUrl: string;
  }) {
    // Determine category IDs based on payment type
    let categoryIds: Types.ObjectId[] = [];
    
    if (data.comboOfferId) {
      // Payment for combo offer
      const comboOffer = await ComboOffer.findById(data.comboOfferId);
      if (!comboOffer) {
        throw new Error('Combo offer not found');
      }
      categoryIds = comboOffer.categoryIds;
    } else if (data.cartId) {
      // Payment from cart
      const cart = await Cart.findById(data.cartId).populate('items.categoryId');
      if (!cart) {
        throw new Error('Cart not found');
      }
      if (cart.userId.toString() !== data.userId) {
        throw new Error('Cart does not belong to user');
      }
      categoryIds = cart.items.map((item: any) => 
        item.categoryId._id || item.categoryId
      );
    } else if (data.categoryIds && data.categoryIds.length > 0) {
      // Multiple categories directly
      categoryIds = data.categoryIds.map(id => new Types.ObjectId(id));
    } else if (data.categoryId) {
      // Single category (backward compatibility)
      categoryIds = [new Types.ObjectId(data.categoryId)];
    } else {
      throw new Error('Either categoryId, categoryIds, cartId, or comboOfferId must be provided');
    }

    // Create payment
    const payment = await Payment.create({
      userId: new Types.ObjectId(data.userId),
      categoryId: categoryIds.length === 1 ? categoryIds[0] : undefined, // For backward compatibility
      categoryIds: categoryIds.length > 1 ? categoryIds : undefined,
      cartId: data.cartId ? new Types.ObjectId(data.cartId) : undefined,
      comboOfferId: data.comboOfferId ? new Types.ObjectId(data.comboOfferId) : undefined,
      comboDurationMonths: data.comboDurationMonths,
      amount: data.amount,
      payerName: data.payerName,
      payerUpiId: data.payerUpiId,
      upiTransactionId: data.upiTransactionId,
      screenshotUrl: data.screenshotUrl,
      status: 'PENDING_REVIEW',
    });

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (data.comboOfferId) {
      // For combo offers, create a single subscription
      const comboOffer = await ComboOffer.findById(data.comboOfferId)
        .populate('categoryIds', 'name price bannerImageUrl');
      
      if (!comboOffer) {
        throw new Error('Combo offer not found');
      }

      // Get selected time period
      let selectedTimePeriod: any = null;
      if (data.comboDurationMonths && comboOffer.timePeriods) {
        selectedTimePeriod = comboOffer.timePeriods.find(
          (tp: any) => tp.months === data.comboDurationMonths
        );
      }

      // Store combo offer details
      const comboOfferDetails = {
        _id: comboOffer._id.toString(),
        name: comboOffer.name,
        description: comboOffer.description,
        imageUrl: comboOffer.imageUrl,
        categoryIds: comboOffer.categoryIds,
        price: comboOffer.price,
        originalPrice: comboOffer.originalPrice,
        benefits: comboOffer.benefits || [],
      };

      // Check if combo offer subscription already exists
      let subscription = await Subscription.findOne({
        userId: new Types.ObjectId(data.userId),
        comboOfferId: new Types.ObjectId(data.comboOfferId),
      });

      if (subscription) {
        subscription.status = 'PENDING_REVIEW';
        subscription.paymentReferenceId = payment._id;
        subscription.comboOfferDetails = comboOfferDetails;
        subscription.selectedDurationMonths = data.comboDurationMonths;
        subscription.selectedTimePeriod = selectedTimePeriod;
        await subscription.save();
      } else {
        subscription = await Subscription.create({
          userId: new Types.ObjectId(data.userId),
          isComboOffer: true,
          comboOfferId: new Types.ObjectId(data.comboOfferId),
          comboOfferDetails: comboOfferDetails,
          selectedDurationMonths: data.comboDurationMonths,
          selectedTimePeriod: selectedTimePeriod,
          status: 'PENDING_REVIEW',
          paymentReferenceId: payment._id,
        });
      }

      subscriptions = [subscription];
    } else {
      // For regular category subscriptions, create one per category
      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId) => {
          // Check for existing subscription by categoryId (this uses the userId+categoryId index)
          let subscription = await Subscription.findOne({
            userId: new Types.ObjectId(data.userId),
            categoryId: categoryId,
          });

          // If found but it's a combo offer subscription, skip it (shouldn't happen, but safety check)
          if (subscription && subscription.isComboOffer) {
            throw new Error(`Category ${categoryId} is already part of a combo offer subscription`);
          }

          if (subscription) {
            // Update existing subscription
            subscription.status = 'PENDING_REVIEW';
            subscription.paymentReferenceId = payment._id;
            subscription.isComboOffer = false; // Ensure it's marked as non-combo
            await subscription.save();
          } else {
            // No existing subscription for this category - create new one
            // Don't include comboOfferId field for non-combo subscriptions (leave it undefined)
            // This avoids conflicts with the sparse unique index on userId+comboOfferId
            try {
              subscription = await Subscription.create({
                userId: new Types.ObjectId(data.userId),
                categoryId: categoryId,
                isComboOffer: false,
                // Don't set comboOfferId at all - let it be undefined to avoid sparse index conflicts
                status: 'PENDING_REVIEW',
                paymentReferenceId: payment._id,
              });
            } catch (error: any) {
              // If duplicate key error (E11000), it means subscription exists - find and update it
              if (error.code === 11000) {
                // The duplicate could be on userId+categoryId or userId+comboOfferId index
                // First try to find by categoryId (most specific)
                subscription = await Subscription.findOne({
                  userId: new Types.ObjectId(data.userId),
                  categoryId: categoryId,
                });
                
                // If not found by categoryId, the duplicate is likely on userId+comboOfferId index
                // This means there's a subscription with comboOfferId: null for this user
                // but for a different category. We need to find it and check if we can update it
                if (!subscription) {
                  // Find subscription with comboOfferId: null/undefined
                  subscription = await Subscription.findOne({
                    userId: new Types.ObjectId(data.userId),
                    $or: [
                      { comboOfferId: null },
                      { comboOfferId: { $exists: false } }
                    ],
                    isComboOffer: false,
                  });
                  
                  // If found, check if it's for a different category
                  // If so, we need to update it to this category (since we can only have one with comboOfferId: null)
                  if (subscription) {
                    // Update the existing subscription to this category
                    subscription.categoryId = categoryId;
                    subscription.status = 'PENDING_REVIEW';
                    subscription.paymentReferenceId = payment._id;
                    subscription.isComboOffer = false;
                    await subscription.save();
                  }
                } else {
                  // Found by categoryId - update it
                  subscription.status = 'PENDING_REVIEW';
                  subscription.paymentReferenceId = payment._id;
                  subscription.isComboOffer = false;
                  await subscription.save();
                }
                
                if (!subscription) {
                  // If we still can't find it, log the error and throw
                  console.error('Duplicate key error but subscription not found:', {
                    userId: data.userId,
                    categoryId: categoryId.toString(),
                    error: error.message,
                    keyPattern: error.keyPattern,
                  });
                  throw new Error(`Duplicate subscription detected but not found. Please contact support. Error: ${error.message}`);
                }
              } else {
                throw error;
              }
            }
          }

          return subscription;
        })
      );
    }

    // Clear cart if payment was from cart
    if (data.cartId) {
      await Cart.findByIdAndUpdate(data.cartId, { items: [], totalAmount: 0 });
    }

    return {
      payment: await Payment.findById(payment._id)
        .populate('categoryId', 'name')
        .populate('categoryIds', 'name')
        .populate('comboOfferId', 'name price originalPrice description')
        .populate('cartId'),
      subscriptions,
    };
  },
};

