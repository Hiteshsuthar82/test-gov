import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
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
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
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
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

