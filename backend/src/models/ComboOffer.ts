import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITimePeriod {
  months: number;
  price: number;
  originalPrice: number;
}

export interface IComboOffer extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  categoryIds: Types.ObjectId[];
  price: number; // Deprecated - use timePeriods instead, kept for backward compatibility
  originalPrice: number; // Deprecated - use timePeriods instead, kept for backward compatibility
  timePeriods?: ITimePeriod[];
  benefits: string[];
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimePeriodSchema = new Schema<ITimePeriod>(
  {
    months: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ComboOfferSchema = new Schema<IComboOffer>(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],
    price: { type: Number }, // Optional for backward compatibility
    originalPrice: { type: Number }, // Optional for backward compatibility
    timePeriods: [TimePeriodSchema],
    benefits: [{ type: String }],
    validFrom: { type: Date },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ComboOfferSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
ComboOfferSchema.index({ categoryIds: 1 });
ComboOfferSchema.index({ createdAt: -1 });

export const ComboOffer = mongoose.model<IComboOffer>('ComboOffer', ComboOfferSchema);

