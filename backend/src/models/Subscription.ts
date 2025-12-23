import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComboOfferDetails {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryIds: Types.ObjectId[];
  price?: number;
  originalPrice?: number;
  benefits: string[];
}

export interface ISelectedTimePeriod {
  months: number;
  price: number;
  originalPrice: number;
}

export interface ISubscriptionHistory {
  createdAt: Date;
  updatedAt: Date;
  startsAt?: Date;
  expiresAt?: Date;
  paymentReferenceId: Types.ObjectId;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  isComboOffer: boolean;
  amount?: number;
  comboOfferId?: Types.ObjectId;
  comboOfferDetails?: IComboOfferDetails;
  selectedDurationMonths?: number;
  selectedTimePeriod?: ISelectedTimePeriod;
}

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  categoryId?: Types.ObjectId; // Optional for combo offers
  isComboOffer: boolean;
  comboOfferId?: Types.ObjectId;
  comboOfferDetails?: IComboOfferDetails;
  selectedDurationMonths?: number;
  selectedTimePeriod?: ISelectedTimePeriod;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  paymentReferenceId?: Types.ObjectId;
  amount?: number; // Individual amount paid for this subscription (for category subscriptions from cart)
  startsAt?: Date;
  expiresAt?: Date;
  subscriptionHistory?: ISubscriptionHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const ComboOfferDetailsSchema = new Schema<IComboOfferDetails>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    price: { type: Number },
    originalPrice: { type: Number },
    benefits: [{ type: String }],
  },
  { _id: false }
);

const SelectedTimePeriodSchema = new Schema<ISelectedTimePeriod>(
  {
    months: { type: Number, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
  },
  { _id: false }
);

const SubscriptionHistorySchema = new Schema<ISubscriptionHistory>(
  {
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    paymentReferenceId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      required: true,
    },
    isComboOffer: { type: Boolean, required: true },
    amount: { type: Number },
    comboOfferId: { type: Schema.Types.ObjectId, ref: 'ComboOffer' },
    comboOfferDetails: ComboOfferDetailsSchema,
    selectedDurationMonths: { type: Number },
    selectedTimePeriod: SelectedTimePeriodSchema,
  },
  { _id: false, timestamps: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, // Optional for combo offers
    isComboOffer: { type: Boolean, default: false },
    comboOfferId: { type: Schema.Types.ObjectId, ref: 'ComboOffer' },
    comboOfferDetails: ComboOfferDetailsSchema,
    selectedDurationMonths: { type: Number },
    selectedTimePeriod: SelectedTimePeriodSchema,
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      required: true,
    },
    paymentReferenceId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    amount: { type: Number }, // Individual amount paid for this subscription
    startsAt: { type: Date },
    expiresAt: { type: Date },
    subscriptionHistory: { type: [SubscriptionHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Unique index for category subscriptions - ensures one subscription per user per category
SubscriptionSchema.index({ userId: 1, categoryId: 1 }, { unique: true, sparse: true });
// Removed userId_1_comboOfferId_1 index as requested - it was causing duplicate key errors
// Regular indexes for querying
SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ categoryId: 1 });
SubscriptionSchema.index({ comboOfferId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ isComboOffer: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

