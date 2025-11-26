import mongoose, { Schema, Document } from 'mongoose';

export interface INotice extends Document {
  title: string;
  description: string;
  linkUrl?: string;
  linkText?: string;
  isActive: boolean;
  validFrom?: Date;
  validTo?: Date;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    linkUrl: { type: String },
    linkText: { type: String },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

NoticeSchema.index({ isActive: 1, validFrom: 1, validTo: 1, sortOrder: 1 });

export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);

