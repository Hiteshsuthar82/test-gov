import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { notificationService } from './notificationService';
import { Types } from 'mongoose';

export const adminPaymentService = {
  async getAll(query: {
    status?: string;
    categoryId?: string;
    partnerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }
    
    // Filter by partnerId - need to find users with this partnerId first
    if (query.partnerId) {
      const usersWithPartner = await User.find({ partnerId: query.partnerId }).select('_id');
      const userIds = usersWithPartner.map(u => u._id);
      if (userIds.length > 0) {
        filter.userId = { $in: userIds };
      } else {
        // No users with this partner, return empty result
        filter.userId = { $in: [] };
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate({
          path: 'userId',
          select: 'name email mobile',
          populate: {
            path: 'partnerId',
            select: 'name businessName code discountPercentage'
          }
        })
        .populate('categoryId', 'name price')
        .populate('categoryIds', 'name price')
        .populate('cartId')
        .populate('comboOfferId', 'name price originalPrice description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const payment = await Payment.findById(id)
      .populate('userId', 'name email mobile')
      .populate('categoryId', 'name price')
      .populate('categoryIds', 'name price')
      .populate('cartId')
      .populate('comboOfferId', 'name price originalPrice');
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  },

  async approve(id: string, adminId: string, adminComment?: string) {
    console.log('=== ADMIN PAYMENT SERVICE: Starting payment approval ===');
    console.log('Step 1: Input data received:', {
      paymentId: id,
      adminId: adminId,
      hasComment: !!adminComment,
    });

    const payment = await Payment.findById(id)
      .populate('categoryId', 'name')
      .populate('categoryIds', 'name')
      .populate('comboOfferId', 'name');
    if (!payment) {
      console.log('Step 1.1: ERROR - Payment not found');
      throw new Error('Payment not found');
    }

    console.log('Step 2: Payment found. Payment type:', {
      hasComboOfferId: !!payment.comboOfferId,
      hasCategoryIds: !!(payment.categoryIds && payment.categoryIds.length > 0),
      hasCategoryId: !!payment.categoryId,
    });

    payment.status = 'APPROVED';
    if (adminComment) {
      payment.adminComment = adminComment;
    }
    await payment.save();
    console.log('Step 3: Payment status updated to APPROVED');

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (payment.comboOfferId) {
      console.log('Step 4: Processing combo offer payment approval');
      // For combo offers, approve the single combo offer subscription
      const ComboOffer = (await import('../models/ComboOffer')).ComboOffer;
      const comboOffer = await ComboOffer.findById(payment.comboOfferId);
      
      if (!comboOffer) {
        console.log('Step 4.1: ERROR - Combo offer not found');
        throw new Error('Combo offer not found');
      }
      
      console.log('Step 4.1: Combo offer found:', comboOffer.name);

      // Calculate expiry date based on selected duration
      const startsAt = new Date();
      let expiresAt: Date;
      if (payment.comboDurationMonths) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + payment.comboDurationMonths);
        expiresAt = expiryDate;
      } else {
        // Default to 1 year if no duration specified
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // Find the combo offer subscription
      console.log('Step 4.2: Searching for combo offer subscription');
      let subscription = await Subscription.findOne({
        userId: payment.userId,
        comboOfferId: payment.comboOfferId,
        isComboOffer: true,
      });

      console.log('Step 4.3: Combo offer subscription search result:', subscription ? 'Found' : 'Not found');
      
      if (subscription) {
        console.log('Step 4.4: Approving existing combo offer subscription with ID:', subscription._id.toString());
        subscription.status = 'APPROVED';
        subscription.paymentReferenceId = payment._id;
        subscription.startsAt = startsAt;
        subscription.expiresAt = expiresAt;
        await subscription.save();
        console.log('Step 4.5: Combo offer subscription approved successfully');
      } else {
        console.log('Step 4.4: Creating new combo offer subscription');
        // If subscription doesn't exist, create it (shouldn't happen, but handle it)
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

        let selectedTimePeriod: any = null;
        if (payment.comboDurationMonths && comboOffer.timePeriods) {
          selectedTimePeriod = comboOffer.timePeriods.find(
            (tp: any) => tp.months === payment.comboDurationMonths
          );
        }

        subscription = await Subscription.create({
          userId: payment.userId,
          isComboOffer: true,
          comboOfferId: payment.comboOfferId,
          comboOfferDetails: comboOfferDetails,
          selectedDurationMonths: payment.comboDurationMonths,
          selectedTimePeriod: selectedTimePeriod,
          status: 'APPROVED',
          paymentReferenceId: payment._id,
          startsAt: startsAt,
          expiresAt: expiresAt,
        });
        console.log('Step 4.5: Combo offer subscription created successfully with ID:', subscription._id.toString());
      }

      subscriptions = [subscription];
      console.log('Step 4.6: Combo offer approval complete');
    } else {
      console.log('Step 4: Processing category payment approval');
      // For regular category subscriptions, approve each category subscription
      let categoryIds: any[] = [];
      if (payment.categoryIds && payment.categoryIds.length > 0) {
        categoryIds = payment.categoryIds;
      } else if (payment.categoryId) {
        categoryIds = [payment.categoryId];
      }

      console.log('Step 4.1: Category IDs to approve:', categoryIds.length);
      console.log('Step 4.2: Category IDs:', categoryIds.map((cat: any) => (cat._id || cat).toString()));

      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          const categoryObjId = categoryId._id || categoryId;
          console.log(`Step 4.3.${index + 1}: Processing category ${index + 1}/${categoryIds.length}:`, categoryObjId.toString());
          
          // Find subscription by categoryId first (most specific)
          let subscription = await Subscription.findOne({
            userId: payment.userId,
            categoryId: categoryObjId,
            isComboOffer: false,
          });
          
          console.log(`Step 4.3.${index + 1}.1: Category subscription search result:`, subscription ? 'Found' : 'Not found');

          // Default to 1 year (365 days) for regular subscriptions
          const startsAt = new Date();
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          if (subscription) {
            console.log(`Step 4.3.${index + 1}.2: Approving existing category subscription with ID:`, subscription._id.toString());
            subscription.status = 'APPROVED';
            subscription.paymentReferenceId = payment._id;
            subscription.startsAt = startsAt;
            subscription.expiresAt = expiresAt;
            subscription.isComboOffer = false; // Ensure it's marked as non-combo
            await subscription.save();
            console.log(`Step 4.3.${index + 1}.3: Category subscription approved successfully`);
          } else {
            console.log(`Step 4.3.${index + 1}.2: Creating new category subscription`);
            // Try to create new subscription
            try {
              subscription = await Subscription.create({
                userId: payment.userId,
                categoryId: categoryObjId,
                isComboOffer: false,
                // Don't set comboOfferId - leave it undefined to avoid sparse index conflicts
                status: 'APPROVED',
                paymentReferenceId: payment._id,
                startsAt: startsAt,
                expiresAt: expiresAt,
              });
            } catch (error: any) {
              // If duplicate key error (E11000), find and update existing subscription
              if (error.code === 11000) {
                // Try to find by categoryId (should exist due to userId+categoryId index)
                subscription = await Subscription.findOne({
                  userId: payment.userId,
                  categoryId: categoryObjId,
                });
                
                // If not found by categoryId, try to find by userId and comboOfferId: null
                if (!subscription) {
                  subscription = await Subscription.findOne({
                    userId: payment.userId,
                    $or: [
                      { comboOfferId: null },
                      { comboOfferId: { $exists: false } }
                    ],
                    isComboOffer: false,
                  });
                  
                  // If found but for different category, update it to this category
                  if (subscription) {
                    subscription.categoryId = categoryObjId;
                  }
                }
                
                if (subscription) {
                  subscription.status = 'APPROVED';
                  subscription.paymentReferenceId = payment._id;
                  subscription.startsAt = startsAt;
                  subscription.expiresAt = expiresAt;
                  subscription.isComboOffer = false;
                  await subscription.save();
                } else {
                  // If we still can't find it, throw error
                  throw new Error(`Duplicate subscription detected for user ${payment.userId} and category ${categoryObjId}, but subscription not found. Error: ${error.message}`);
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

    // Send notification
    try {
      let message = '';
      if (payment.comboOfferId) {
        const comboOffer = await (await import('../models/ComboOffer')).ComboOffer.findById(payment.comboOfferId);
        const comboName = comboOffer?.name || 'Combo Offer';
        message = `Your payment for combo offer "${comboName}" has been approved. You can now access all included categories.`;
      } else {
        let categoryIds: any[] = [];
        if (payment.categoryIds && payment.categoryIds.length > 0) {
          categoryIds = payment.categoryIds;
        } else if (payment.categoryId) {
          categoryIds = [payment.categoryId];
        }
        const categoryNames = categoryIds.map((cat: any) => cat.name || 'category').join(', ');
        message = categoryIds.length > 1
          ? `Your payment for ${categoryIds.length} categories has been approved. You can now access all test sets.`
          : `Your payment for ${categoryNames} has been approved. You can now access all test sets.`;
      }

      await notificationService.sendNotification({
        title: 'Payment Approved',
        message,
        type: 'payment_approved',
        target: 'USER',
        userId: payment.userId.toString(),
        createdByAdminId: adminId,
      });
      console.log('Step 5.1: Notification sent successfully');
    } catch (error) {
      console.error('Step 5: ERROR - Failed to send notification:', error);
    }

    console.log('Step 6: Payment approval complete');
    console.log('=== ADMIN PAYMENT SERVICE: Payment approval finished ===');
    return { payment, subscriptions };
  },

  async reject(id: string, adminId: string, adminComment: string) {
    console.log('=== ADMIN PAYMENT SERVICE: Starting payment rejection ===');
    console.log('Step 1: Input data received:', {
      paymentId: id,
      adminId: adminId,
      hasComment: !!adminComment,
    });

    const payment = await Payment.findById(id)
      .populate('categoryIds', 'name')
      .populate('comboOfferId', 'name');
    if (!payment) {
      console.log('Step 1.1: ERROR - Payment not found');
      throw new Error('Payment not found');
    }

    console.log('Step 2: Payment found. Payment type:', {
      hasComboOfferId: !!payment.comboOfferId,
      hasCategoryIds: !!(payment.categoryIds && payment.categoryIds.length > 0),
      hasCategoryId: !!payment.categoryId,
    });

    payment.status = 'REJECTED';
    payment.adminComment = adminComment;
    await payment.save();
    console.log('Step 3: Payment status updated to REJECTED');

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (payment.comboOfferId) {
      console.log('Step 4: Processing combo offer payment rejection');
      // For combo offers, reject the single combo offer subscription
      // Find the combo offer subscription
      let subscription = await Subscription.findOne({
        userId: payment.userId,
        comboOfferId: payment.comboOfferId,
        isComboOffer: true,
      });

      console.log('Step 4.1: Combo offer subscription search result:', subscription ? 'Found' : 'Not found');
      
      if (subscription) {
        console.log('Step 4.2: Rejecting combo offer subscription with ID:', subscription._id.toString());
        subscription.status = 'REJECTED';
        subscription.paymentReferenceId = payment._id;
        await subscription.save();
        console.log('Step 4.3: Combo offer subscription rejected successfully');
      } else {
        console.log('Step 4.2: WARNING - Combo offer subscription not found for rejection');
      }

      subscriptions = subscription ? [subscription] : [];
    } else {
      console.log('Step 4: Processing category payment rejection');
      // For regular category subscriptions, reject each category subscription
      // Determine category IDs to reject
      let categoryIds: any[] = [];
      if (payment.categoryIds && payment.categoryIds.length > 0) {
        categoryIds = payment.categoryIds;
      } else if (payment.categoryId) {
        categoryIds = [payment.categoryId];
      }

      console.log('Step 4.1: Category IDs to reject:', categoryIds.length);
      console.log('Step 4.2: Category IDs:', categoryIds.map((cat: any) => (cat._id || cat).toString()));

      // Update subscriptions for all categories
      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          const categoryObjId = categoryId._id || categoryId;
          console.log(`Step 4.3.${index + 1}: Processing category ${index + 1}/${categoryIds.length}:`, categoryObjId.toString());
          
          const subscription = await Subscription.findOne({
            userId: payment.userId,
            categoryId: categoryObjId,
            isComboOffer: false,
          });

          console.log(`Step 4.3.${index + 1}.1: Category subscription search result:`, subscription ? 'Found' : 'Not found');

          if (subscription) {
            console.log(`Step 4.3.${index + 1}.2: Rejecting category subscription with ID:`, subscription._id.toString());
            subscription.status = 'REJECTED';
            subscription.paymentReferenceId = payment._id;
            await subscription.save();
            console.log(`Step 4.3.${index + 1}.3: Category subscription rejected successfully`);
          } else {
            console.log(`Step 4.3.${index + 1}.2: WARNING - Category subscription not found for rejection`);
          }

          return subscription;
        })
      );
    }

    // Send notification
    try {
      let message = '';
      if (payment.comboOfferId) {
        const comboOffer = await (await import('../models/ComboOffer')).ComboOffer.findById(payment.comboOfferId);
        const comboName = comboOffer?.name || 'Combo Offer';
        message = `Your payment for combo offer "${comboName}" has been rejected. ${adminComment ? `Reason: ${adminComment}` : ''}`;
      } else {
        let categoryIds: any[] = [];
        if (payment.categoryIds && payment.categoryIds.length > 0) {
          categoryIds = payment.categoryIds;
        } else if (payment.categoryId) {
          categoryIds = [payment.categoryId];
        }
        const categoryNames = categoryIds.map((cat: any) => cat.name || 'category').join(', ');
        message = categoryIds.length > 1
          ? `Your payment for ${categoryIds.length} categories has been rejected. ${adminComment ? `Reason: ${adminComment}` : ''}`
          : `Your payment for ${categoryNames} has been rejected. ${adminComment ? `Reason: ${adminComment}` : ''}`;
      }

      console.log('Step 5: Sending rejection notification');
      await notificationService.sendNotification({
        title: 'Payment Rejected',
        message,
        type: 'payment_rejected',
        target: 'USER',
        userId: payment.userId.toString(),
        createdByAdminId: adminId,
      });
      console.log('Step 5.1: Notification sent successfully');
    } catch (error) {
      console.error('Step 5: ERROR - Failed to send notification:', error);
    }

    console.log('Step 6: Payment rejection complete');
    console.log('=== ADMIN PAYMENT SERVICE: Payment rejection finished ===');
    return { payment, subscriptions };
  },
};

