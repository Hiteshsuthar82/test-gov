import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  categoryId?: Types.ObjectId; // Optional for cart payments
  categoryIds?: Types.ObjectId[]; // For multiple categories from cart
  cartId?: Types.ObjectId; // Reference to cart if payment is from cart
  comboOfferId?: Types.ObjectId; // Reference to combo offer if payment is for combo
  comboDurationMonths?: number; // Duration in months for combo offer payment
  amount: number;
  payerName: string;
  payerUpiId: string;
  upiTransactionId?: string;
  screenshotUrl: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  adminComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, // Optional for cart/combo payments
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }], // For multiple categories
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart' }, // Reference to cart
    comboOfferId: { type: Schema.Types.ObjectId, ref: 'ComboOffer' }, // Reference to combo offer
    comboDurationMonths: { type: Number }, // Duration in months for combo offer
    amount: { type: Number, required: true },
    payerName: { type: String, required: true },
    payerUpiId: { type: String, required: true },
    upiTransactionId: { type: String },
    screenshotUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING_REVIEW',
    },
    adminComment: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ categoryId: 1 });
PaymentSchema.index({ cartId: 1 });
PaymentSchema.index({ comboOfferId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

