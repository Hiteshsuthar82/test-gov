import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  bannerImageUrl?: string;
  price: number;
  details?: string;
  detailsFormatted?: string;
  isActive: boolean;
  totalSetsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    description: { type: String },
    bannerImageUrl: { type: String },
    price: { type: Number, required: true },
    details: { type: String },
    detailsFormatted: { type: String },
    isActive: { type: Boolean, default: true },
    totalSetsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.index({ isActive: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

