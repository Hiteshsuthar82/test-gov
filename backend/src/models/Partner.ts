import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
  name: string;
  businessName: string;
  mobile: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    name: { type: String, required: true },
    businessName: { type: String, required: true },
    mobile: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PartnerSchema.index({ code: 1 });
PartnerSchema.index({ isActive: 1 });

export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema);

