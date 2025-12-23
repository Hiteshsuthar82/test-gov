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
    const payment = await Payment.findById(id)
      .populate('categoryId', 'name')
      .populate('categoryIds', 'name')
      .populate('comboOfferId', 'name');
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'APPROVED';
    if (adminComment) {
      payment.adminComment = adminComment;
    }
    await payment.save();

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (payment.comboOfferId) {
      // For combo offers, approve the single combo offer subscription
      const ComboOffer = (await import('../models/ComboOffer')).ComboOffer;
      const comboOffer = await ComboOffer.findById(payment.comboOfferId);
      
      if (!comboOffer) {
        throw new Error('Combo offer not found');
      }

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
      let subscription = await Subscription.findOne({
        userId: payment.userId,
        comboOfferId: payment.comboOfferId,
        isComboOffer: true,
      });

      if (subscription) {
        subscription.status = 'APPROVED';
        subscription.paymentReferenceId = payment._id;
        subscription.startsAt = startsAt;
        subscription.expiresAt = expiresAt;
        
        // Update history entry for this payment
        if (!subscription.subscriptionHistory) {
          subscription.subscriptionHistory = [];
        }
        const historyEntry = subscription.subscriptionHistory.find(
          (h: any) => h.paymentReferenceId && h.paymentReferenceId.toString() === payment._id.toString()
        );
        if (historyEntry) {
          historyEntry.status = 'APPROVED';
          historyEntry.updatedAt = new Date();
          historyEntry.startsAt = startsAt;
          historyEntry.expiresAt = expiresAt;
          // Update combo offer details if they exist
          if (subscription.comboOfferDetails) {
            historyEntry.comboOfferDetails = subscription.comboOfferDetails;
          }
          if (subscription.comboOfferId) {
            historyEntry.comboOfferId = subscription.comboOfferId;
          }
          if (subscription.selectedDurationMonths) {
            historyEntry.selectedDurationMonths = subscription.selectedDurationMonths;
          }
          if (subscription.selectedTimePeriod) {
            historyEntry.selectedTimePeriod = subscription.selectedTimePeriod;
          }
          if (payment.amount) {
            historyEntry.amount = payment.amount;
          }
        } else {
          // Create history entry if it doesn't exist (safety fallback)
          subscription.subscriptionHistory.push({
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentReferenceId: payment._id,
            status: 'APPROVED',
            isComboOffer: true,
            startsAt: startsAt,
            expiresAt: expiresAt,
            amount: payment.amount,
            comboOfferId: subscription.comboOfferId,
            comboOfferDetails: subscription.comboOfferDetails,
            selectedDurationMonths: subscription.selectedDurationMonths,
            selectedTimePeriod: subscription.selectedTimePeriod,
          });
        }
        
        await subscription.save();
      } else {
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
          subscriptionHistory: [{
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentReferenceId: payment._id,
            status: 'APPROVED',
            isComboOffer: true,
            startsAt: startsAt,
            expiresAt: expiresAt,
            amount: payment.amount,
            comboOfferId: payment.comboOfferId,
            comboOfferDetails: comboOfferDetails,
            selectedDurationMonths: payment.comboDurationMonths,
            selectedTimePeriod: selectedTimePeriod,
          }],
        });
      }

      subscriptions = [subscription];
    } else {
      // For regular category subscriptions, approve each category subscription
      let categoryIds: any[] = [];
      if (payment.categoryIds && payment.categoryIds.length > 0) {
        categoryIds = payment.categoryIds;
      } else if (payment.categoryId) {
        categoryIds = [payment.categoryId];
      }

      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          const categoryObjId = categoryId._id || categoryId;
          // Find subscription by categoryId first (most specific)
          let subscription = await Subscription.findOne({
            userId: payment.userId,
            categoryId: categoryObjId,
            isComboOffer: false,
          });

          // Get individual amount for this category from payment.categoryAmounts
          let categoryAmount = 0;
          if (payment.categoryAmounts && payment.categoryAmounts instanceof Map) {
            categoryAmount = payment.categoryAmounts.get(categoryObjId.toString()) || 0;
          } else if (payment.categoryAmounts && typeof payment.categoryAmounts === 'object') {
            // Handle case where categoryAmounts is stored as plain object
            categoryAmount = (payment.categoryAmounts as any)[categoryObjId.toString()] || 0;
          }
          // If no individual amount found, calculate from total amount divided by number of categories
          if (categoryAmount === 0 && categoryIds.length > 0) {
            categoryAmount = payment.amount / categoryIds.length;
          }

          // Default to 1 year (365 days) for regular subscriptions
          const startsAt = new Date();
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          if (subscription) {
            subscription.status = 'APPROVED';
            subscription.paymentReferenceId = payment._id;
            subscription.startsAt = startsAt;
            subscription.expiresAt = expiresAt;
            subscription.isComboOffer = false; // Ensure it's marked as non-combo
            subscription.amount = categoryAmount;
            
            // Update history entry for this payment
            if (!subscription.subscriptionHistory) {
              subscription.subscriptionHistory = [];
            }
            const historyEntry = subscription.subscriptionHistory.find(
              (h: any) => h.paymentReferenceId && h.paymentReferenceId.toString() === payment._id.toString()
            );
            if (historyEntry) {
              historyEntry.status = 'APPROVED';
              historyEntry.updatedAt = new Date();
              historyEntry.startsAt = startsAt;
              historyEntry.expiresAt = expiresAt;
              historyEntry.amount = categoryAmount;
            } else {
              // Create history entry if it doesn't exist (safety fallback)
              subscription.subscriptionHistory.push({
                createdAt: new Date(),
                updatedAt: new Date(),
                paymentReferenceId: payment._id,
                status: 'APPROVED',
                isComboOffer: false,
                startsAt: startsAt,
                expiresAt: expiresAt,
                amount: categoryAmount,
              });
            }
            
            await subscription.save();
          } else {
            // Try to create new subscription
            try {
              subscription = await Subscription.create({
                userId: payment.userId,
                categoryId: categoryObjId,
                isComboOffer: false,
                // Don't set comboOfferId - leave it undefined to avoid sparse index conflicts
                status: 'APPROVED',
                paymentReferenceId: payment._id,
                amount: categoryAmount,
                startsAt: startsAt,
                expiresAt: expiresAt,
                subscriptionHistory: [{
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  paymentReferenceId: payment._id,
                  status: 'APPROVED',
                  isComboOffer: false,
                  startsAt: startsAt,
                  expiresAt: expiresAt,
                  amount: categoryAmount,
                }],
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
                  subscription.amount = categoryAmount;
                  
                  // Update history entry for this payment
                  if (!subscription.subscriptionHistory) {
                    subscription.subscriptionHistory = [];
                  }
                  const historyEntry = subscription.subscriptionHistory.find(
                    (h: any) => h.paymentReferenceId && h.paymentReferenceId.toString() === payment._id.toString()
                  );
                  if (historyEntry) {
                    historyEntry.status = 'APPROVED';
                    historyEntry.updatedAt = new Date();
                    historyEntry.startsAt = startsAt;
                    historyEntry.expiresAt = expiresAt;
                    historyEntry.amount = categoryAmount;
                  } else {
                    // Create history entry if it doesn't exist (safety fallback)
                    subscription.subscriptionHistory.push({
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      paymentReferenceId: payment._id,
                      status: 'APPROVED',
                      isComboOffer: false,
                      startsAt: startsAt,
                      expiresAt: expiresAt,
                      amount: categoryAmount,
                    });
                  }
                  
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
    } catch (error) {
      console.error('Step 5: ERROR - Failed to send notification:', error);
    }

    return { payment, subscriptions };
  },

  async reject(id: string, adminId: string, adminComment: string) {
    const payment = await Payment.findById(id)
      .populate('categoryIds', 'name')
      .populate('comboOfferId', 'name');
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = 'REJECTED';
    payment.adminComment = adminComment;
    await payment.save();

    // Handle combo offer subscriptions differently
    let subscriptions: any[] = [];
    
    if (payment.comboOfferId) {
      // For combo offers, reject the single combo offer subscription
      // Find the combo offer subscription
      let subscription = await Subscription.findOne({
        userId: payment.userId,
        comboOfferId: payment.comboOfferId,
        isComboOffer: true,
      });

      if (subscription) {
        subscription.status = 'REJECTED';
        subscription.paymentReferenceId = payment._id;
        
        // Update history entry for this payment
        if (!subscription.subscriptionHistory) {
          subscription.subscriptionHistory = [];
        }
        const historyEntry = subscription.subscriptionHistory.find(
          (h: any) => h.paymentReferenceId && h.paymentReferenceId.toString() === payment._id.toString()
        );
        if (historyEntry) {
          historyEntry.status = 'REJECTED';
          historyEntry.updatedAt = new Date();
          // Update combo offer details if they exist
          if (subscription.comboOfferDetails) {
            historyEntry.comboOfferDetails = subscription.comboOfferDetails;
          }
          if (subscription.comboOfferId) {
            historyEntry.comboOfferId = subscription.comboOfferId;
          }
          if (subscription.selectedDurationMonths) {
            historyEntry.selectedDurationMonths = subscription.selectedDurationMonths;
          }
          if (subscription.selectedTimePeriod) {
            historyEntry.selectedTimePeriod = subscription.selectedTimePeriod;
          }
          if (payment.amount) {
            historyEntry.amount = payment.amount;
          }
        } else {
          // Create history entry if it doesn't exist (safety fallback)
          subscription.subscriptionHistory.push({
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentReferenceId: payment._id,
            status: 'REJECTED',
            isComboOffer: true,
            amount: payment.amount,
            comboOfferId: subscription.comboOfferId,
            comboOfferDetails: subscription.comboOfferDetails,
            selectedDurationMonths: subscription.selectedDurationMonths,
            selectedTimePeriod: subscription.selectedTimePeriod,
          });
        }
        
        await subscription.save();
      }

      subscriptions = subscription ? [subscription] : [];
    } else {
      // For regular category subscriptions, reject each category subscription
      // Determine category IDs to reject
      let categoryIds: any[] = [];
      if (payment.categoryIds && payment.categoryIds.length > 0) {
        categoryIds = payment.categoryIds;
      } else if (payment.categoryId) {
        categoryIds = [payment.categoryId];
      }

      // Update subscriptions for all categories
      subscriptions = await Promise.all(
        categoryIds.map(async (categoryId, index) => {
          const categoryObjId = categoryId._id || categoryId;
          const subscription = await Subscription.findOne({
            userId: payment.userId,
            categoryId: categoryObjId,
            isComboOffer: false,
          });

          if (subscription) {
            subscription.status = 'REJECTED';
            subscription.paymentReferenceId = payment._id;
            
            // Get individual amount for this category from payment.categoryAmounts
            let categoryAmount = 0;
            if (payment.categoryAmounts && payment.categoryAmounts instanceof Map) {
              categoryAmount = payment.categoryAmounts.get(categoryObjId.toString()) || 0;
            } else if (payment.categoryAmounts && typeof payment.categoryAmounts === 'object') {
              categoryAmount = (payment.categoryAmounts as any)[categoryObjId.toString()] || 0;
            }
            if (categoryAmount === 0 && categoryIds.length > 0) {
              categoryAmount = payment.amount / categoryIds.length;
            }
            
            // Update history entry for this payment
            if (!subscription.subscriptionHistory) {
              subscription.subscriptionHistory = [];
            }
            const historyEntry = subscription.subscriptionHistory.find(
              (h: any) => h.paymentReferenceId && h.paymentReferenceId.toString() === payment._id.toString()
            );
            if (historyEntry) {
              historyEntry.status = 'REJECTED';
              historyEntry.updatedAt = new Date();
              historyEntry.amount = categoryAmount;
            } else {
              // Create history entry if it doesn't exist (safety fallback)
              subscription.subscriptionHistory.push({
                createdAt: new Date(),
                updatedAt: new Date(),
                paymentReferenceId: payment._id,
                status: 'REJECTED',
                isComboOffer: subscription.isComboOffer,
                amount: categoryAmount,
              });
            }
            
            await subscription.save();
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

      await notificationService.sendNotification({
        title: 'Payment Rejected',
        message,
        type: 'payment_rejected',
        target: 'USER',
        userId: payment.userId.toString(),
        createdByAdminId: adminId,
      });
    } catch (error) {
      console.error('Step 5: ERROR - Failed to send notification:', error);
    }

    return { payment, subscriptions };
  },
};

