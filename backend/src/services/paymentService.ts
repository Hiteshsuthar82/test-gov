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
    console.log('=== PAYMENT SERVICE: Starting payment creation ===');
    console.log('Step 1: Input data received:', {
      userId: data.userId,
      cartId: data.cartId,
      comboOfferId: data.comboOfferId,
      categoryId: data.categoryId,
      categoryIds: data.categoryIds,
      amount: data.amount,
    });

    // Determine category IDs based on payment type
    let categoryIds: Types.ObjectId[] = [];
    
    if (data.comboOfferId) {
      console.log('Step 2: Processing combo offer payment');
      // Payment for combo offer
      const comboOffer = await ComboOffer.findById(data.comboOfferId);
      if (!comboOffer) {
        throw new Error('Combo offer not found');
      }
      categoryIds = comboOffer.categoryIds;
      console.log('Step 2.1: Combo offer categoryIds extracted:', categoryIds.map(id => id.toString()));
    } else if (data.cartId) {
      console.log('Step 2: Processing cart payment');
      // Payment from cart
      const cart = await Cart.findById(data.cartId).populate('items.categoryId');
      if (!cart) {
        console.log('Step 2.1: ERROR - Cart not found');
        throw new Error('Cart not found');
      }
      console.log('Step 2.2: Cart found with', cart.items.length, 'items');
      if (cart.userId.toString() !== data.userId) {
        console.log('Step 2.3: ERROR - Cart does not belong to user');
        throw new Error('Cart does not belong to user');
      }
      // Extract categoryIds and ensure all are ObjectId instances
      categoryIds = cart.items.map((item: any) => {
        const catId = item.categoryId._id || item.categoryId;
        // Ensure it's an ObjectId instance
        return catId instanceof Types.ObjectId ? catId : new Types.ObjectId(catId);
      });
      console.log('Step 2.3: CategoryIds extracted from cart:', categoryIds.map(id => id.toString()));
      console.log('Step 2.4: Total categories to process:', categoryIds.length);
    } else if (data.categoryIds && data.categoryIds.length > 0) {
      console.log('Step 2: Processing multiple categories directly');
      // Multiple categories directly
      categoryIds = data.categoryIds.map(id => new Types.ObjectId(id));
      console.log('Step 2.1: CategoryIds extracted:', categoryIds.map(id => id.toString()));
    } else if (data.categoryId) {
      console.log('Step 2: Processing single category');
      // Single category (backward compatibility)
      categoryIds = [new Types.ObjectId(data.categoryId)];
      console.log('Step 2.1: CategoryId extracted:', categoryIds[0].toString());
    } else {
      console.log('Step 2: ERROR - No payment type specified');
      throw new Error('Either categoryId, categoryIds, cartId, or comboOfferId must be provided');
    }

    console.log('Step 3: Creating payment record');
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
    console.log('Step 3.1: Payment created with ID:', payment._id.toString());

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (data.comboOfferId) {
      console.log('Step 4: Creating combo offer subscription');
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
      console.log('Step 4.1: Combo offer subscription created/updated');
    } else {
      console.log('Step 4: Creating category subscriptions for', categoryIds.length, 'categories');
      // For regular category subscriptions, create one per category
      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          console.log(`Step 4.${index + 1}: Processing category ${index + 1}/${categoryIds.length}:`, categoryId.toString());
          
          // Ensure categoryId is an ObjectId instance
          const categoryObjectId = categoryId instanceof Types.ObjectId 
            ? categoryId 
            : new Types.ObjectId(categoryId);
          
          console.log(`Step 4.${index + 1}.1: Checking for existing subscription for category:`, categoryObjectId.toString());
          // Check for existing subscription by categoryId (this uses the userId+categoryId index)
          // Check for subscription with any status (PENDING_REVIEW, APPROVED, REJECTED)
          let subscription = await Subscription.findOne({
            userId: new Types.ObjectId(data.userId),
            categoryId: categoryObjectId,
          });
          
          console.log(`Step 4.${index + 1}.2: Existing subscription check result:`, subscription ? 'Found' : 'Not found');
          if (subscription) {
            console.log(`Step 4.${index + 1}.2.1: Existing subscription details:`, {
              _id: subscription._id.toString(),
              status: subscription.status,
              isComboOffer: subscription.isComboOffer,
              categoryId: subscription.categoryId?.toString(),
              comboOfferId: subscription.comboOfferId?.toString() || 'null/undefined',
            });
          }

          // If found but it's a combo offer subscription, skip it (shouldn't happen, but safety check)
          if (subscription && subscription.isComboOffer) {
            console.log(`Step 4.${index + 1}.3: ERROR - Category is part of combo offer`);
            throw new Error(`Category ${categoryObjectId} is already part of a combo offer subscription`);
          }

          if (subscription) {
            console.log(`Step 4.${index + 1}.3: Updating existing subscription`);
            // Update existing subscription regardless of current status (REJECTED, PENDING_REVIEW, etc.)
            // IMPORTANT: Unset comboOfferId if it exists to avoid sparse index conflicts
            subscription.status = 'PENDING_REVIEW';
            subscription.paymentReferenceId = payment._id;
            subscription.isComboOffer = false;
            // Explicitly unset comboOfferId to ensure it's completely removed (not null)
            subscription.comboOfferId = undefined;
            // Use updateOne with $unset to ensure the field is completely removed from the document
            await Subscription.updateOne(
              { _id: subscription._id },
              { $unset: { comboOfferId: "" } }
            );
            await subscription.save();
            console.log(`Step 4.${index + 1}.3.1: Subscription updated successfully`);
          } else {
            console.log(`Step 4.${index + 1}.3: Creating new subscription`);
            // No existing subscription for this category - create new one
            // IMPORTANT: Build subscription object without comboOfferId field at all
            // This avoids conflicts with the sparse unique index on userId+comboOfferId
            const subscriptionData: any = {
              userId: new Types.ObjectId(data.userId),
              categoryId: categoryObjectId,
              isComboOffer: false,
              status: 'PENDING_REVIEW',
              paymentReferenceId: payment._id,
            };
            // Explicitly ensure comboOfferId is NOT in the object (not even as undefined or null)
            delete subscriptionData.comboOfferId;
            console.log(`Step 4.${index + 1}.3.1: Subscription data to create:`, {
              userId: subscriptionData.userId.toString(),
              categoryId: subscriptionData.categoryId.toString(),
              isComboOffer: subscriptionData.isComboOffer,
              status: subscriptionData.status,
              hasComboOfferId: 'comboOfferId' in subscriptionData,
              keys: Object.keys(subscriptionData),
            });
            
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
              console.log(`Step 4.${index + 1}.3.2: Subscription created successfully with ID:`, subscription._id.toString());
              console.log(`Step 4.${index + 1}.3.2.1: Subscription comboOfferId after creation:`, subscription?.comboOfferId);
            } catch (error: any) {
              console.log(`Step 4.${index + 1}.3.3: ERROR during subscription creation:`, {
                code: error.code,
                message: error.message,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue,
              });
              
              // If duplicate key error (E11000), it means subscription exists - find and update it
              // Note: After removing userId_1_comboOfferId_1 index, this should only happen for userId+categoryId index
              if (error.code === 11000) {
                console.log(`Step 4.${index + 1}.3.4: Duplicate key error detected. Key pattern:`, error.keyPattern);
                console.log(`Step 4.${index + 1}.3.5: Duplicate key value:`, error.keyValue);
                
                // Check which index caused the duplicate
                const isCategoryIndex = error.keyPattern && error.keyPattern.categoryId;
                
                console.log(`Step 4.${index + 1}.3.6: Duplicate on index:`, {
                  isCategoryIndex,
                });
                
                if (isCategoryIndex) {
                  // Duplicate on userId+categoryId index - subscription exists for this category
                  console.log(`Step 4.${index + 1}.3.7: Searching for subscription with userId and categoryId`);
                  subscription = await Subscription.findOne({
                    userId: new Types.ObjectId(data.userId),
                    categoryId: categoryObjectId,
                  });
                  
                  if (subscription) {
                    console.log(`Step 4.${index + 1}.3.8: Found existing subscription for this category`);
                    subscription.status = 'PENDING_REVIEW';
                    subscription.paymentReferenceId = payment._id;
                    subscription.isComboOffer = false;
                    subscription.categoryId = categoryObjectId;
                    // Use $unset to completely remove comboOfferId field if it exists
                    await Subscription.updateOne(
                      { _id: subscription._id },
                      { $unset: { comboOfferId: "" } }
                    );
                    subscription.comboOfferId = undefined;
                    await subscription.save();
                    console.log(`Step 4.${index + 1}.3.9: Subscription updated successfully`);
                  }
                } else {
                  // Try to find by categoryId as fallback
                  console.log(`Step 4.${index + 1}.3.7: Trying fallback search by categoryId`);
                  subscription = await Subscription.findOne({
                    userId: new Types.ObjectId(data.userId),
                    categoryId: categoryObjectId,
                    isComboOffer: false,
                  });
                  
                  if (subscription) {
                    console.log(`Step 4.${index + 1}.3.8: Found subscription via fallback search`);
                    subscription.status = 'PENDING_REVIEW';
                    subscription.paymentReferenceId = payment._id;
                    subscription.isComboOffer = false;
                    subscription.categoryId = categoryObjectId;
                    await Subscription.updateOne(
                      { _id: subscription._id },
                      { $unset: { comboOfferId: "" } }
                    );
                    subscription.comboOfferId = undefined;
                    await subscription.save();
                    console.log(`Step 4.${index + 1}.3.9: Subscription updated successfully`);
                  }
                }
                
                if (!subscription) {
                  // If we still can't find it, log detailed error and throw
                  console.error(`Step 4.${index + 1}.3.10: CRITICAL ERROR - Duplicate key error but subscription not found:`, {
                    userId: data.userId,
                    categoryId: categoryObjectId.toString(),
                    error: error.message,
                    keyPattern: error.keyPattern,
                    keyValue: error.keyValue,
                    stack: error.stack,
                  });
                  throw new Error(`Duplicate subscription detected but not found. Please contact support. Error: ${error.message}`);
                }
              } else {
                console.error(`Step 4.${index + 1}.3.4: Non-duplicate error:`, error);
                throw error;
              }
            }
          }

          console.log(`Step 4.${index + 1}.4: Category ${index + 1} processing complete. Subscription ID:`, subscription._id.toString());
          return subscription;
        })
      );
      console.log('Step 4.5: All category subscriptions created/updated. Total:', subscriptions.length);
    }

    console.log('Step 5: Clearing cart if payment was from cart');
    // Clear cart if payment was from cart
    if (data.cartId) {
      await Cart.findByIdAndUpdate(data.cartId, { items: [], totalAmount: 0 });
      console.log('Step 5.1: Cart cleared');
    }

    console.log('Step 6: Payment creation complete. Returning result');
    console.log('=== PAYMENT SERVICE: Payment creation finished successfully ===');
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

