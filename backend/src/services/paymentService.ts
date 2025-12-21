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
          let subscription = await Subscription.findOne({
            userId: new Types.ObjectId(data.userId),
            categoryId: categoryId,
            isComboOffer: false, // Ensure it's not a combo offer
          });

          if (subscription) {
            subscription.status = 'PENDING_REVIEW';
            subscription.paymentReferenceId = payment._id;
            await subscription.save();
          } else {
            subscription = await Subscription.create({
              userId: new Types.ObjectId(data.userId),
              categoryId: categoryId,
              isComboOffer: false,
              status: 'PENDING_REVIEW',
              paymentReferenceId: payment._id,
            });
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

