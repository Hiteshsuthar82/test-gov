import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  categoryId?: Types.ObjectId; // Optional for cart payments
  categoryIds?: Types.ObjectId[]; // For multiple categories from cart
  cartId?: Types.ObjectId; // Reference to cart if payment is from cart
  comboOfferId?: Types.ObjectId; // Reference to combo offer if payment is for combo
  comboDurationMonths?: number; // Duration in months for combo offer payment
  categoryDurationMonths?: number; // Duration in months for single category payment with time periods
  categoryDurationMonthsMap?: Map<string, number>; // Map of categoryId to selected duration months for cart items
  amount: number;
  categoryAmounts?: Map<string, number>; // Map of categoryId (as string) to individual amount paid for that category
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
    categoryDurationMonths: { type: Number }, // Duration in months for single category with time periods
    categoryDurationMonthsMap: { type: Map, of: Number }, // Map of categoryId to duration months for cart
    amount: { type: Number, required: true },
    categoryAmounts: { type: Map, of: Number }, // Map of categoryId (as string) to individual amount
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

// Removed all indexes as requested

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

