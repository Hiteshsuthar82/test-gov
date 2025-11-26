import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { Types } from 'mongoose';

export const paymentService = {
  async create(data: {
    userId: string;
    categoryId: string;
    amount: number;
    payerName: string;
    payerUpiId: string;
    upiTransactionId?: string;
    screenshotUrl: string;
  }) {
    const payment = await Payment.create({
      userId: new Types.ObjectId(data.userId),
      categoryId: new Types.ObjectId(data.categoryId),
      amount: data.amount,
      payerName: data.payerName,
      payerUpiId: data.payerUpiId,
      upiTransactionId: data.upiTransactionId,
      screenshotUrl: data.screenshotUrl,
      status: 'PENDING_REVIEW',
    });

    // Find or create subscription
    let subscription = await Subscription.findOne({
      userId: new Types.ObjectId(data.userId),
      categoryId: new Types.ObjectId(data.categoryId),
    });

    if (subscription) {
      subscription.status = 'PENDING_REVIEW';
      subscription.paymentReferenceId = payment._id;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        userId: new Types.ObjectId(data.userId),
        categoryId: new Types.ObjectId(data.categoryId),
        status: 'PENDING_REVIEW',
        paymentReferenceId: payment._id,
      });
    }

    return {
      payment: await Payment.findById(payment._id).populate('categoryId', 'name'),
      subscription,
    };
  },
};

