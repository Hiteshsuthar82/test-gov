import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  paymentReferenceId?: Types.ObjectId;
  startsAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      required: true,
    },
    paymentReferenceId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    startsAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, categoryId: 1 }, { unique: true });
SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ categoryId: 1 });
SubscriptionSchema.index({ status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

