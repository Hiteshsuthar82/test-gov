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
    // Calculate categoryAmounts map for individual category amounts
    let categoryAmounts = new Map<string, number>();
    
    if (data.comboOfferId) {
      // Payment for combo offer
      const comboOffer = await ComboOffer.findById(data.comboOfferId);
      if (!comboOffer) {
        throw new Error('Combo offer not found');
      }
      categoryIds = comboOffer.categoryIds;
      // For combo offers, the amount is for the entire combo, not individual categories
      // So we don't set categoryAmounts for combo offers
    } else if (data.cartId) {
      // Payment from cart
      const cart = await Cart.findById(data.cartId).populate('items.categoryId');
      if (!cart) {
        throw new Error('Cart not found');
      }
      if (cart.userId.toString() !== data.userId) {
        throw new Error('Cart does not belong to user');
      }
      // Extract categoryIds and ensure all are ObjectId instances
      categoryIds = cart.items.map((item: any) => {
        const catId = item.categoryId._id || item.categoryId;
        // Ensure it's an ObjectId instance
        const categoryObjectId = catId instanceof Types.ObjectId ? catId : new Types.ObjectId(catId);
        // Store individual amount for this category
        categoryAmounts.set(categoryObjectId.toString(), item.price || 0);
        return categoryObjectId;
      });
    } else if (data.categoryIds && data.categoryIds.length > 0) {
      // Multiple categories directly - split amount equally (or use category prices if available)
      categoryIds = data.categoryIds.map(id => new Types.ObjectId(id));
      // For direct category payments, we'll need to get prices from categories
      const { Category } = await import('../models/Category');
      const categories = await Category.find({ _id: { $in: categoryIds } });
      const totalCategoryPrice = categories.reduce((sum, cat) => sum + (cat.price || 0), 0);
      // If total category price matches payment amount, use individual prices
      // Otherwise, split equally
      if (Math.abs(totalCategoryPrice - data.amount) < 0.01) {
        categories.forEach(cat => {
          categoryAmounts.set(cat._id.toString(), cat.price || 0);
        });
      } else {
        // Split equally
        const amountPerCategory = data.amount / categoryIds.length;
        categoryIds.forEach(catId => {
          categoryAmounts.set(catId.toString(), amountPerCategory);
        });
      }
    } else if (data.categoryId) {
      // Single category (backward compatibility)
      categoryIds = [new Types.ObjectId(data.categoryId)];
      categoryAmounts.set(categoryIds[0].toString(), data.amount);
    } else {
      throw new Error('Either categoryId, categoryIds, cartId, or comboOfferId must be provided');
    }

    // Create payment
    const payment = await Payment.create({
      userId: new Types.ObjectId(data.userId),
      categoryId: categoryIds.length === 1 && !data.cartId && !data.comboOfferId ? categoryIds[0] : undefined, // For backward compatibility (single category, not cart/combo)
      categoryIds: (categoryIds.length > 0 && (data.cartId || data.comboOfferId || categoryIds.length > 1)) ? categoryIds : undefined, // Always store for cart/combo or multiple categories
      cartId: data.cartId ? new Types.ObjectId(data.cartId) : undefined,
      comboOfferId: data.comboOfferId ? new Types.ObjectId(data.comboOfferId) : undefined,
      comboDurationMonths: data.comboDurationMonths,
      amount: data.amount,
      categoryAmounts: categoryAmounts.size > 0 ? Object.fromEntries(categoryAmounts) : undefined,
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
        
        // Add history entry
        if (!subscription.subscriptionHistory) {
          subscription.subscriptionHistory = [];
        }
        subscription.subscriptionHistory.push({
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentReferenceId: payment._id,
          status: 'PENDING_REVIEW',
          isComboOffer: true,
          amount: data.amount,
          comboOfferId: new Types.ObjectId(data.comboOfferId),
          comboOfferDetails: comboOfferDetails,
          selectedDurationMonths: data.comboDurationMonths,
          selectedTimePeriod: selectedTimePeriod,
        });
        
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
          subscriptionHistory: [{
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentReferenceId: payment._id,
            status: 'PENDING_REVIEW',
            isComboOffer: true,
            amount: data.amount,
            comboOfferId: new Types.ObjectId(data.comboOfferId),
            comboOfferDetails: comboOfferDetails,
            selectedDurationMonths: data.comboDurationMonths,
            selectedTimePeriod: selectedTimePeriod,
          }],
        });
      }

      subscriptions = [subscription];
    } else {
      // For regular category subscriptions, create one per category
      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          // Ensure categoryId is an ObjectId instance
          const categoryObjectId = categoryId instanceof Types.ObjectId 
            ? categoryId 
            : new Types.ObjectId(categoryId);

          // Check for existing subscription by categoryId (this uses the userId+categoryId index)
          // Check for subscription with any status (PENDING_REVIEW, APPROVED, REJECTED)
          let subscription = await Subscription.findOne({
            userId: new Types.ObjectId(data.userId),
            categoryId: categoryObjectId,
          });

          // If found but it's a combo offer subscription, skip it (shouldn't happen, but safety check)
          if (subscription && subscription.isComboOffer) {
            throw new Error(`Category ${categoryObjectId} is already part of a combo offer subscription`);
          }

          // Get individual amount for this category from categoryAmounts
          let categoryAmount = categoryAmounts.get(categoryObjectId.toString()) || 0;
          // If no individual amount found in map, calculate from total amount divided by number of categories
          if (categoryAmount === 0 && categoryIds.length > 0) {
            categoryAmount = data.amount / categoryIds.length;
          }

          if (subscription) {
            // Update existing subscription regardless of current status (REJECTED, PENDING_REVIEW, etc.)
            // IMPORTANT: Unset comboOfferId if it exists to avoid sparse index conflicts
            subscription.status = 'PENDING_REVIEW';
            subscription.paymentReferenceId = payment._id;
            subscription.isComboOffer = false;
            subscription.amount = categoryAmount;
            // Explicitly unset comboOfferId to ensure it's completely removed (not null)
            subscription.comboOfferId = undefined;
            
            // Add history entry
            if (!subscription.subscriptionHistory) {
              subscription.subscriptionHistory = [];
            }
            subscription.subscriptionHistory.push({
              createdAt: new Date(),
              updatedAt: new Date(),
              paymentReferenceId: payment._id,
              status: 'PENDING_REVIEW',
              isComboOffer: false,
              amount: categoryAmount,
            });
            
            // Use updateOne with $unset to ensure the field is completely removed from the document
            await Subscription.updateOne(
              { _id: subscription._id },
              { $unset: { comboOfferId: "" } }
            );
            await subscription.save();
          } else {
            // No existing subscription for this category - create new one
            // IMPORTANT: Build subscription object without comboOfferId field at all
            // This avoids conflicts with the sparse unique index on userId+comboOfferId
            const subscriptionData: any = {
              userId: new Types.ObjectId(data.userId),
              categoryId: categoryObjectId,
              isComboOffer: false,
              status: 'PENDING_REVIEW',
              paymentReferenceId: payment._id,
              amount: categoryAmount,
              subscriptionHistory: [{
                createdAt: new Date(),
                updatedAt: new Date(),
                paymentReferenceId: payment._id,
                status: 'PENDING_REVIEW',
                isComboOffer: false,
                amount: categoryAmount,
              }],
            };
            // Explicitly ensure comboOfferId is NOT in the object (not even as undefined or null)
            delete subscriptionData.comboOfferId;
            
            try {
              subscription = await Subscription.create(subscriptionData);
              // Immediately unset comboOfferId if MongoDB set it to null (prevent future issues)
              if (subscription.comboOfferId === null || subscription.comboOfferId === undefined) {
                await Subscription.updateOne(
                  { _id: subscription._id },
                  { $unset: { comboOfferId: "" } }
                );
                // Reload to get updated document
                subscription = await Subscription.findById(subscription._id);
              }
            } catch (error: any) {
              // If duplicate key error (E11000), it means subscription exists - find and update it
              // Note: After removing userId_1_comboOfferId_1 index, this should only happen for userId+categoryId index
              if (error.code === 11000) {
                // Check which index caused the duplicate
                const isCategoryIndex = error.keyPattern && error.keyPattern.categoryId;

                if (isCategoryIndex) {
                  // Duplicate on userId+categoryId index - subscription exists for this category
                  subscription = await Subscription.findOne({
                    userId: new Types.ObjectId(data.userId),
                    categoryId: categoryObjectId,
                  });
                  
                  if (subscription) {
                    subscription.status = 'PENDING_REVIEW';
                    subscription.paymentReferenceId = payment._id;
                    subscription.isComboOffer = false;
                    subscription.categoryId = categoryObjectId;
                    subscription.amount = categoryAmount;
                    
                    // Add history entry
                    if (!subscription.subscriptionHistory) {
                      subscription.subscriptionHistory = [];
                    }
                    subscription.subscriptionHistory.push({
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      paymentReferenceId: payment._id,
                      status: 'PENDING_REVIEW',
                      isComboOffer: false,
                    });
                    
                    // Use $unset to completely remove comboOfferId field if it exists
                    await Subscription.updateOne(
                      { _id: subscription._id },
                      { $unset: { comboOfferId: "" } }
                    );
                    subscription.comboOfferId = undefined;
                    await subscription.save();
                  }
                } else {
                  // Try to find by categoryId as fallback
                  subscription = await Subscription.findOne({
                    userId: new Types.ObjectId(data.userId),
                    categoryId: categoryObjectId,
                    isComboOffer: false,
                  });
                  
                  if (subscription) {
                    subscription.status = 'PENDING_REVIEW';
                    subscription.paymentReferenceId = payment._id;
                    subscription.isComboOffer = false;
                    subscription.categoryId = categoryObjectId;
                    subscription.amount = categoryAmount;
                    
                    // Add history entry
                    if (!subscription.subscriptionHistory) {
                      subscription.subscriptionHistory = [];
                    }
                    subscription.subscriptionHistory.push({
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      paymentReferenceId: payment._id,
                      status: 'PENDING_REVIEW',
                      isComboOffer: false,
                    });
                    
                    await Subscription.updateOne(
                      { _id: subscription._id },
                      { $unset: { comboOfferId: "" } }
                    );
                    subscription.comboOfferId = undefined;
                    await subscription.save();
                  }
                }
                
                if (!subscription) {
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

